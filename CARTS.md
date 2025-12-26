# Customer-to-Shopper Cart System - Complete Architecture

## 🎯 Overview

This document explains how the **summon-customer** and **summon-shopper** apps work together to enable customers to create shopping orders and shoppers to fulfill them.

**App Locations:**
- Customer app: `/home/bur1/Holochain/summon-customer`
- Shopper app: `/home/bur1/Holochain/summon-shopper`
- Shared DNAs: `/home/bur1/Holochain/summon-dnas/` (symlinked to both apps)

---

## 📋 The Complete Workflow

### Phase 1: Customer Creates Order (summon-customer)

**1. Customer Creates Cart Clone**
- Customer opens summon-customer app
- App creates a cart.dna clone with `network_seed = customerAgentPubKey`
- This creates a unique DHT network for this customer's cart

**Location:** `/home/bur1/Holochain/summon-customer/ui/src/cart/services/CartCloneService.ts`
```typescript
// Customer creates their own cart clone
const clone = await client.createCloneCell({
    modifiers: { network_seed: agentPubKeyB64 },
    name: `customer-cart-${agentPubKeyB64.slice(0, 8)}`,
    role_name: "cart"
});
```

**2. Customer Adds Products to Cart**
- Customer scans barcodes or selects products
- Products added to cart.dna using `add_cart_item` zome function
- All cart data stored on PUBLIC path `"active_carts"` in cart.dna

**Location:** `/home/bur1/Holochain/summon-customer/ui/src/cart/services/CartBusinessService.ts`
```typescript
await client.callZome({
    cell_id: cloneCellId,
    zome_name: 'cart',
    fn_name: 'add_cart_item',
    payload: { product: cartProduct, quantity: quantity }
});
```

**3. Customer Sets Delivery Details**
- Selects delivery address
- Chooses delivery time window (e.g., "Monday 2pm-4pm")
- Adds delivery instructions
- All saved to cart.dna as Holochain Records

**Location:** `/home/bur1/Holochain/summon-customer/ui/src/cart/services/CheckoutService.ts`

**4. Customer Checks Out (Publishes Order)**
- Customer clicks "Publish Order" / "Checkout"
- Two things happen:

**a) Change cart status to "Checkout":**
```typescript
await client.callZome({
    cell_id: cloneCellId,
    zome_name: 'cart',
    fn_name: 'publish_order',
    payload: null
});
```

**b) Post cart network seed to order_finder.dna:**
```typescript
const cartNetworkSeed = encodeHashToBase64(client.myPubKey);
const timeSlot = get(selectedDeliveryTimeSlot);
const deliveryTimeStr = formatDeliveryTime(timeSlot); // e.g., "Monday, Dec 23 at 2pm-4pm"
await postOrderRequest(
    'Customer',           // customer_name
    cartNetworkSeed,      // cart_network_seed (e.g., "uhCAkf_3Vu...")
    '$0.00',             // estimated_total
    deliveryTimeStr      // actual delivery time from store
);
```

This creates an `OrderRequest` entry in order_finder.dna that contains the cart network seed.

---

### Phase 2: Shopper Discovers Orders (summon-shopper)

**1. Shopper Opens App and Loads Orders**
- Shopper opens summon-shopper app
- App queries order_finder.dna for available orders

**Location:** `/home/bur1/Holochain/summon-shopper/ui/src/cart/services/OrdersService.ts`
```typescript
export async function loadOrders() {
    const allOrderRequests = await getAvailableOrders(); // Queries order_finder.dna
    // Returns array of orders with cart network seeds
}
```

**2. For Each Order, Load Delivery Time**
- To show delivery time in the list, shopper joins customer's cart clone
- Calls `get_session_data` to get delivery time, decodes it, formats it
- **Note:** This creates N cart clones for N orders (necessary to show delivery times)

**Location:** `/home/bur1/Holochain/summon-shopper/ui/src/cart/services/OrdersService.ts`
```typescript
async function loadDeliveryTimeForOrder(cartNetworkSeed: string, placeholderTime: string) {
    const detailsResult = await loadOrderDetails(cartNetworkSeed);
    // Joins cart clone, gets session data, decodes delivery time
}
```

**3. Display Orders in List**
- Shows order cards with:
  - Customer avatar (from profiles.dna)
  - Order timestamp
  - Delivery time window
  - Order status

**Location:** `/home/bur1/Holochain/summon-shopper/ui/src/cart/orders/components/OrdersView.svelte`

---

### Phase 3: Shopper Views Order Details (summon-shopper)

**1. Shopper Clicks on an Order**
- OrderDetailView opens
- Calls `loadOrderDetails(cartNetworkSeed)`

**2. Join Customer's Cart Clone**
- Shopper creates cart.dna clone with **SAME network_seed** as customer
- This puts shopper on the SAME DHT network as customer
- Both now share the same cart data

**Location:** `/home/bur1/Holochain/summon-shopper/ui/src/cart/services/CartCloneService.ts`
```typescript
export async function joinCustomerCartClone(customerNetworkSeed: string) {
    const clone = await client.createCloneCell({
        modifiers: { network_seed: customerNetworkSeed }, // Customer's pub key
        name: `customer-cart-${customerNetworkSeed.slice(0, 8)}`,
        role_name: "cart"
    });
    return clone.cell_id;
}
```

**3. Load Customer's Cart Data**
- Calls `get_current_items` to get products
- Calls `get_session_data` to get address, delivery time, instructions
- All from the shared cart.dna clone

**Location:** `/home/bur1/Holochain/summon-shopper/ui/src/cart/services/OrdersService.ts`
```typescript
export async function loadOrderDetails(cartNetworkSeed: string) {
    const customerCartCellId = await joinCustomerCartClone(cartNetworkSeed);

    const products = await client.callZome({
        cell_id: customerCartCellId,
        zome_name: 'cart',
        fn_name: 'get_current_items',
        payload: null
    });

    const sessionData = await client.callZome({
        cell_id: customerCartCellId,
        zome_name: 'cart',
        fn_name: 'get_session_data',
        payload: null
    });

    return { products, address, delivery_time, delivery_instructions };
}
```

**4. Decode and Display Data**
- Products: Flattened structure from backend (product_name, product_image_url, price_at_checkout, quantity)
- Address: Holochain Record → decoded with msgpack
- Delivery time: Holochain Record → decoded → formatted for display
- Instructions: Holochain Record → decoded → plain text

**Location:** `/home/bur1/Holochain/summon-shopper/ui/src/cart/orders/components/OrderDetailView.svelte`
```typescript
// Decode delivery data using shared utilities
deliveryAddress = decodeAddress(result.data.address);
deliveryTime = formatDeliveryTimeForDisplay(decodeDeliveryTimeSlot(result.data.delivery_time));
deliveryInstructions = decodeDeliveryInstructions(result.data.delivery_instructions)?.instructions;
```

---

## 🏗️ Architecture Details

### Shared DNA System

Both apps use **symlinks** to shared DNAs in `/home/bur1/Holochain/summon-dnas/`:
- `cart/` - Shopping cart with products, address, delivery info
- `profiles/` - User profiles (customer and shopper)
- `order_finder/` - Discovery network for posting/finding orders

**Why symlinks?**
- DNAs compiled once from shared location
- Both apps use IDENTICAL DNA code
- Ensures compatibility and data sharing

### Cart Clone Architecture

**Key Concept:** Cart.dna uses `network_seed` to create isolated DHT networks

**Customer's clone:**
```
network_seed = customerAgentPubKey (e.g., "uhCAkf_3Vu...")
→ Creates unique DNA hash
→ Customer's private cart network
```

**Shopper joins same clone:**
```
network_seed = customerAgentPubKey (SAME as customer)
→ Creates SAME DNA hash
→ Joins customer's cart network
→ Can see all customer's data
```

**Result:** Both on same DHT network, sharing same cart data!

### Data Storage in Cart.dna

All cart data stored on **PUBLIC path** `"active_carts"`:

**Backend:** `/home/bur1/Holochain/summon-dnas/cart/zomes/coordinator/cart/src/cart.rs`
```rust
fn get_public_cart_path() -> ExternResult<Path> {
    let path_str = "active_carts";  // SHARED by all agents!
    Path::try_from(path_str)
}
```

**What this means:**
- Any agent on the same cart clone network can see all data
- Shopper can read customer's products, address, delivery info
- No private/public distinction - all agents share everything

### Product Data Structure

**Backend returns (from `get_current_items`):**
```rust
pub struct CartProductWithHash {
    #[serde(flatten)]  // ← Products are FLATTENED!
    pub product: CartProduct,
    pub action_hash: ActionHash,
    pub quantity: f64,
    pub timestamp: u64,
}
```

**Frontend receives:**
```javascript
{
  product_id: "...",
  product_name: "Apples",
  product_image_url: "...",
  price_at_checkout: 3.99,
  quantity: 1.0,
  upc: "123456",
  sold_by: "LB",
  note: "Organic please",
  action_hash: [...],
  timestamp: 1234567890
}
```

**NOT nested like this:**
```javascript
{
  product: { product_name: "Apples", ... },
  quantity: 1
}
```

### Decoding Holochain Records

Delivery data (address, time, instructions) stored as Holochain Records and need msgpack decoding:

**Shared utilities:** `/home/bur1/Holochain/summon-shopper/ui/src/cart/utils/recordDecoders.ts`
```typescript
export function decodeAddress(addressRecord: any): any | null {
    const entryBytes = new Uint8Array(addressRecord.entry.Present.entry);
    return decode(entryBytes) as any;
}
```

Both customer and shopper apps use these same decode patterns.

---

## 📁 Key Files Reference

### Customer App (`/home/bur1/Holochain/summon-customer`)

**Services:**
- `ui/src/cart/services/CartCloneService.ts` - Creates customer's cart clone
- `ui/src/cart/services/CartBusinessService.ts` - Adds products to cart
- `ui/src/cart/services/CheckoutService.ts` - Publishes order to order_finder.dna
- `ui/src/cart/services/OrderFinderService.ts` - Posts OrderRequest

**Components:**
- `ui/src/cart/orders/components/OrdersView.svelte` - Shows customer's own checkout order
- `ui/src/cart/orders/components/OrderCard.svelte` - Displays order details

### Shopper App (`/home/bur1/Holochain/summon-shopper`)

**Services:**
- `ui/src/cart/services/CartCloneService.ts` - Joins customer cart clones
- `ui/src/cart/services/OrdersService.ts` - Loads orders, joins carts, gets data
- `ui/src/cart/services/OrderFinderService.ts` - Queries available orders

**Components:**
- `ui/src/cart/orders/components/OrdersView.svelte` - Lists all available orders
- `ui/src/cart/orders/components/OrderCard.svelte` - Shows order in list
- `ui/src/cart/orders/components/OrderDetailView.svelte` - Full order details after click

**Utilities:**
- `ui/src/cart/utils/recordDecoders.ts` - Shared decode functions for Records

### Shared Backend (`/home/bur1/Holochain/summon-dnas`)

**Cart DNA:**
- `cart/zomes/coordinator/cart/src/cart.rs` - Main cart logic
  - `get_current_items_impl()` - Returns products
  - `get_session_data_impl()` - Returns address, delivery time, instructions
  - `publish_order()` - Changes status to "Checkout"

**Order Finder DNA:**
- `order_finder/zomes/coordinator/order_finder/src/order_finder.rs` - Order discovery
  - `post_order_request()` - Posts OrderRequest with cart network seed
  - `get_available_orders()` - Returns all OrderRequests

---

## ✅ Current Status (2025-12-23)

### What Works ✅

1. **Customer checkout flow:**
   - Create cart ✅
   - Add products ✅
   - Set delivery details ✅
   - Publish to order_finder.dna ✅

2. **Shopper discovery:**
   - Query order_finder.dna ✅
   - See list of orders ✅
   - Join customer cart clones ✅
   - Load products, address, delivery time ✅

3. **Data display:**
   - Products show correctly (name, image, price, quantity) ✅
   - Delivery address displays properly ✅
   - Delivery time window shows formatted date/time ✅
   - Delivery instructions appear ✅

4. **Network communication:**
   - Both apps connect to same bootstrap server ✅
   - Share same DHT network ✅
   - Data flows from customer to shopper ✅

### Code Quality ✅

- **Clean architecture:** List/detail pattern in shopper app
- **No duplication:** Decode functions extracted to shared utilities
- **Readable:** Functions split into focused helpers
- **Maintainable:** Clear separation of concerns

---

## 🎯 Success Criteria

When everything works correctly:

1. ✅ Customer creates cart with products
2. ✅ Customer sets delivery address and time window
3. ✅ Customer checks out → order appears in order_finder.dna
4. ✅ Shopper sees order in list with delivery time
5. ✅ Shopper clicks order → sees all products, address, delivery details
6. ✅ Both apps on same DHT, sharing data seamlessly

**Status:** All criteria met! System working correctly. 🎉

---

## 🔧 Troubleshooting

### If orders don't appear in shopper list:
1. Check bootstrap server running on port 39101
2. Verify both apps using same bootstrap URL
3. Check DNA hashes match: `hc dna hash dnas/order_finder/workdir/order_finder.dna`

### If products show "undefined" or empty:
1. Check backend returns flattened structure (not nested)
2. Verify decode functions imported from `utils/recordDecoders.ts`
3. Check products accessed as `product.product_name` not `product.product.product_name`

### If delivery time shows "undefined at undefined":
1. Verify OrderCard handles both data formats (list vs detail)
2. Check `formatDeliveryTimeForDisplay()` being used
3. Ensure `loadOrderDetails()` called to get actual time from cart.dna
