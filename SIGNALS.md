# Holochain Signals - Cart Real-Time Communication

## Status: WORKING & REFACTORED (2025-12-29)

Real-time signals between customer and shopper apps are working. The code has been refactored to be **DRY, type-safe, and easily extensible**.

---

## Architecture Overview

### Shared Code Pattern (DRY)

**ALL signal code is shared** via symlinks to `summon-dnas/ui-shared/signals/`. Both apps use identical code - no duplication.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    SHARED CODE (Source of Truth)                            │
│                                                                             │
│    /home/bur1/Holochain/summon-dnas/ui-shared/signals/                     │
│    ├── SignalService.ts      # WebSocket signal listener & routing         │
│    ├── sendSignal.ts         # Typed helper functions to send signals      │
│    ├── types.ts              # Discriminated union types (type-safe!)      │
│    ├── CartClient.ts         # Client abstraction (like volla's RelayClient)│
│    ├── utils.ts              # Utility functions (formatHour, etc.)        │
│    ├── index.ts              # Barrel exports                              │
│    └── stores/                                                             │
│        ├── peerStore.ts      # Peer pubkey state management               │
│        └── cartSignalStore.ts # Handler map for signal processing          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                    │                                     │
           symlinks │                                     │ symlinks
                    ▼                                     ▼
┌─────────────────────────────────────┐    ┌─────────────────────────────────────┐
│         CUSTOMER APP                │    │          SHOPPER APP                │
│  summon-customer/ui/src/signals/    │    │  summon-shopper/ui/src/signals/     │
│                                     │    │                                     │
│  All files → symlinks to shared     │    │  All files → symlinks to shared     │
│  index.ts (local re-exports)        │    │  index.ts (local re-exports)        │
│                                     │    │                                     │
│  Customer sends:                    │    │  Shopper sends:                     │
│  - ItemAdded                        │◄──►│  - ShopperJoined                    │
│  - ItemRemoved                      │    │  - ItemScanned                      │
│  - NoteUpdated                      │    │  - StatusChanged                    │
│  - DeliveryTimeChanged              │    │                                     │
│  - InstructionsChanged              │    │                                     │
│  - AddressChanged                   │    │                                     │
│  - StatusChanged                    │    │                                     │
└─────────────────────────────────────┘    └─────────────────────────────────────┘
```

---

## File Structure

### Shared Files (in summon-dnas/ui-shared/signals/)

| File | Purpose |
|------|---------|
| `SignalService.ts` | Singleton service - listens to WebSocket signals, routes to handlers |
| `sendSignal.ts` | Typed helper functions: `sendItemAdded()`, `sendNoteUpdated()`, etc. |
| `types.ts` | **Discriminated union types** - all signal payloads, type-safe |
| `CartClient.ts` | Client abstraction wrapping AppClient (like volla's RelayClient) |
| `utils.ts` | Utility functions: `formatHour()`, `formatDateLong()`, etc. |
| `index.ts` | Barrel exports for the shared module |
| `stores/peerStore.ts` | Stores connected peer's pubkey for signal routing |
| `stores/cartSignalStore.ts` | **Handler map pattern** - processes incoming signals |

### App-Specific Files

| File | Purpose |
|------|---------|
| `index.ts` | Re-exports shared code + app-specific exports |

---

## How to Add a New Signal Type

Adding a new signal is easy with the handler map pattern. Example: Adding `OrderConfirmed`:

### Step 1: Update `types.ts`

```typescript
// 1. Add to CartRemoteSignalType union
export type CartRemoteSignalType =
    | 'ShopperJoined'
    | 'ItemScanned'
    // ... existing types
    | 'OrderConfirmed';  // ← ADD HERE

// 2. Add payload interface
export interface OrderConfirmedPayload {
    order_id: string;
    confirmed_at: number;
    shopper_name: string;
}

// 3. Add to CartRemoteSignalPayloadMap
export type CartRemoteSignalPayloadMap = {
    // ... existing mappings
    OrderConfirmed: OrderConfirmedPayload;  // ← ADD HERE
};

// 4. Add to CartRemoteSignal discriminated union
export type CartRemoteSignal =
    | { type: 'ShopperJoined'; data: ShopperJoinedPayload }
    // ... existing types
    | { type: 'OrderConfirmed'; data: OrderConfirmedPayload };  // ← ADD HERE
```

### Step 2: Update `cartSignalStore.ts`

```typescript
// 1. Import the new payload type
import type { ..., OrderConfirmedPayload } from '../types';

// 2. Add handler function
function handleOrderConfirmed(data: OrderConfirmedPayload): void {
    // Update stores, trigger UI updates, etc.
    console.log('[CartSignals] Order confirmed by:', data.shopper_name);
}

// 3. Add to signalHandlers map (ONE LINE!)
const signalHandlers: Record<CartRemoteSignalType, SignalHandler<any>> = {
    // ... existing handlers
    OrderConfirmed: (data: OrderConfirmedPayload) => handleOrderConfirmed(data),  // ← ADD HERE
};
```

### Step 3: Add convenience function in `sendSignal.ts` (optional)

```typescript
export async function sendOrderConfirmed(
    client: AppClient,
    cellId: CellId,
    orderId: string,
    shopperName: string
): Promise<boolean> {
    return sendCartSignal(client, cellId, 'OrderConfirmed', {
        order_id: orderId,
        confirmed_at: Date.now(),
        shopper_name: shopperName,
    });
}
```

### Step 4: Update Rust (if needed)

In `summon-dnas/cart/zomes/coordinator/cart/src/lib.rs`:

```rust
#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(tag = "type", content = "data")]
pub enum CartRemoteSignal {
    // ... existing variants
    OrderConfirmed {
        order_id: String,
        confirmed_at: i64,
        shopper_name: String,
    },
}
```

**That's it!** The handler map pattern makes adding signals a 4-step process.

---

## TypeScript Types (Discriminated Union Pattern)

The types use **discriminated unions** for type safety. TypeScript knows exactly which payload goes with which signal type:

```typescript
// Signal type names
export type CartRemoteSignalType =
    | 'ShopperJoined'
    | 'ItemScanned'
    | 'NoteUpdated'
    | 'ItemAdded'
    | 'ItemRemoved'
    | 'DeliveryTimeChanged'
    | 'InstructionsChanged'
    | 'AddressChanged'
    | 'StatusChanged';

// Payload type map (maps signal type → payload interface)
export type CartRemoteSignalPayloadMap = {
    ShopperJoined: ShopperJoinedPayload;
    ItemScanned: ItemScannedPayload;
    NoteUpdated: NoteUpdatedPayload;
    ItemAdded: ItemAddedPayload;
    ItemRemoved: ItemRemovedPayload;
    DeliveryTimeChanged: DeliveryTimeChangedPayload;
    InstructionsChanged: InstructionsChangedPayload;
    AddressChanged: AddressChangedPayload;
    StatusChanged: StatusChangedPayload;
};

// Discriminated union - TypeScript knows which data goes with which type
export type CartRemoteSignal =
    | { type: 'ShopperJoined'; data: ShopperJoinedPayload }
    | { type: 'ItemScanned'; data: ItemScannedPayload }
    | { type: 'NoteUpdated'; data: NoteUpdatedPayload }
    | { type: 'ItemAdded'; data: ItemAddedPayload }
    | { type: 'ItemRemoved'; data: ItemRemovedPayload }
    | { type: 'DeliveryTimeChanged'; data: DeliveryTimeChangedPayload }
    | { type: 'InstructionsChanged'; data: InstructionsChangedPayload }
    | { type: 'AddressChanged'; data: AddressChangedPayload }
    | { type: 'StatusChanged'; data: StatusChangedPayload };
```

---

## Handler Map Pattern

Instead of a switch statement, signals are routed via a typed handler map:

```typescript
// Handler map - easy to extend, type-safe
const signalHandlers: Record<CartRemoteSignalType, SignalHandler<any>> = {
    ShopperJoined: (data, ctx) => handleShopperJoined(ctx.fromPubKey, data),
    ItemScanned: (data) => handleItemScanned(data),
    NoteUpdated: (data) => handleNoteUpdated(data),
    ItemAdded: (data) => handleItemAdded(data),
    ItemRemoved: (data) => handleItemRemoved(data),
    DeliveryTimeChanged: (data) => handleDeliveryTimeChanged(data),
    InstructionsChanged: (data) => handleInstructionsChanged(data),
    AddressChanged: (data) => handleAddressChanged(data),
    StatusChanged: (data) => handleStatusChanged(data),
};

// Signal dispatch (5 lines instead of 30-line switch)
const handler = signalHandlers[remoteSignal.type];
if (handler) {
    handler(remoteSignal.data, ctx);
} else {
    console.warn('[CartSignals] Unknown signal type:', remoteSignal.type);
}
```

---

## CartClient Usage

`CartClient` wraps `AppClient` for cleaner cart operations:

```typescript
import { CartClient } from '$signals';

// Create client once
const cartClient = new CartClient(appClient, cartCellId);

// Send signals (typed!)
await cartClient.sendSignal('ItemScanned', recipientPubKey, {
    product_id: '123',
    status: 'found',
    substitute_info: null,
});

// Get cart data
const items = await cartClient.getCurrentItems();
const session = await cartClient.getSessionData();
```

---

## Utility Functions

Extracted to `utils.ts` for reuse:

```typescript
import { formatHour, formatTimeRange, formatDateLong, formatDateShort } from '$signals';

formatHour(14)              // "2pm"
formatHour(0)               // "12am"
formatTimeRange(9, 17)      // "9am - 5pm"
formatDateLong(Date.now())  // "Sunday, December 29, 2025"
formatDateShort(Date.now()) // "Dec 29"
```

---

## Signal Flow

### 1. Shopper Opens Order → Customer Notified

```
Shopper: Opens OrderDetailView
  → onMount() calls sendShopperJoined(client, cellId, customerPubKey, "Shopper")
  → Rust send_cart_signal() → send_remote_signal() to customer
  → Customer's recv_remote_signal() receives signal
  → Customer's SignalService receives WebSocket signal
  → signalHandlers['ShopperJoined'] executes
  → peerStore.setPeer(shopperPubKey) stores shopper for future signals
```

### 2. Customer Adds Item → Shopper UI Updates

```
Customer: Clicks "Add to Cart"
  → CartBusinessService.addToCart()
  → Saves to DHT
  → sendItemAdded(client, cellId, cartProduct, quantity)
  → Rust send_cart_signal() → send_remote_signal() to shopper
  → Shopper's SignalService receives signal
  → signalHandlers['ItemAdded'] executes
  → cartItems store updates with full product data
  → UI reactively updates
```

---

## Service Files That Send Signals

| File | Signals Sent |
|------|--------------|
| `summon-customer/.../CartBusinessService.ts` | sendItemAdded, sendItemRemoved |
| `summon-customer/.../CheckoutService.ts` | sendStatusChanged, sendDeliveryTimeChanged, sendInstructionsChanged |
| `summon-customer/.../AddressService.ts` | sendAddressChanged |
| `summon-customer/.../PreferencesService.ts` | sendNoteUpdated |
| `summon-shopper/.../OrderDetailView.svelte` | sendShopperJoined |

---

## Symlink Structure

All signal files are symlinked from the shared location:

```bash
# In summon-shopper/ui/src/signals/ (same for customer)
SignalService.ts      → ../../../../summon-dnas/ui-shared/signals/SignalService.ts
sendSignal.ts         → ../../../../summon-dnas/ui-shared/signals/sendSignal.ts
types.ts              → ../../../../summon-dnas/ui-shared/signals/types.ts
CartClient.ts         → ../../../../summon-dnas/ui-shared/signals/CartClient.ts
utils.ts              → ../../../../summon-dnas/ui-shared/signals/utils.ts
stores/peerStore.ts   → ../../../../../summon-dnas/ui-shared/signals/stores/peerStore.ts
stores/cartSignalStore.ts → ../../../../../summon-dnas/ui-shared/signals/stores/cartSignalStore.ts
```

**To verify symlinks:**
```bash
cd summon-shopper/ui/src/signals
file SignalService.ts  # Should show: symbolic link to ...
```

---

## Rust Signal Enum

Located in: `summon-dnas/cart/zomes/coordinator/cart/src/lib.rs`

```rust
#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(tag = "type", content = "data")]
pub enum CartRemoteSignal {
    ShopperJoined { shopper_name: String },

    ItemScanned {
        product_id: String,
        status: String,  // "found", "not_found", "substituted"
        substitute_info: Option<String>,
    },

    NoteUpdated { product_id: String, note: String },

    ItemAdded {
        product_id: String,
        upc: String,
        product_name: String,
        product_image_url: String,
        price_at_checkout: f64,
        promo_price: Option<f64>,
        sold_by: String,
        note: Option<String>,
        quantity: f64,
    },

    ItemRemoved { product_id: String },

    DeliveryTimeChanged {
        date: i64,
        day: String,
        start_hour: u32,
        end_hour: u32,
    },

    InstructionsChanged { instructions: String },

    AddressChanged {
        street: String,
        unit: Option<String>,
        city: String,
        state: String,
        zip: String,
        lat: f64,
        lng: f64,
    },

    StatusChanged { status: String },
}
```

---

## Rebuilding After Changes

### TypeScript changes (summon-dnas/ui-shared/signals/):
- Changes are **immediately reflected** in both apps (symlinks)
- Just restart dev servers

### Rust changes (CartRemoteSignal enum):
```bash
# Rebuild cart DNA
cd /home/bur1/Holochain/summon-dnas/cart
cargo build --release --target wasm32-unknown-unknown

# Rebuild happs
cd /home/bur1/Holochain/summon-customer && npm run build:happ
cd /home/bur1/Holochain/summon-shopper && npm run build:happ
```

---

## Testing Checklist

- [x] Shopper opens order → Sends ShopperJoined to customer
- [x] Customer adds item → Shopper sees item with image, price, quantity
- [x] Customer adds same item 3x → Shopper sees quantity: 3
- [x] Customer updates note → Shopper sees note change live
- [x] Customer removes item → Shopper sees item disappear
- [x] Customer removes ALL items → Shopper sees empty cart
- [x] Customer changes address → Shopper sees address update
- [x] Customer changes delivery time → Shopper sees time update
- [x] Customer changes instructions → Shopper sees instructions update
- [ ] Shopper scans item → Customer sees checkmark (TODO)
- [ ] Shopper changes status → Customer sees order progress (TODO)

---

## Refactoring Completed (2025-12-29)

| Step | Description | Status |
|------|-------------|--------|
| 1 | Share cartSignalStore.ts via Symlink | ✅ |
| 2 | Add Proper Types (discriminated unions) | ✅ |
| 3 | Create CartClient.ts Abstraction | ✅ |
| 4 | Replace Console Logs with Debug Flag | ⏭️ Skipped |
| 5 | Refactor Switch to Handler Map | ✅ |
| 6 | Extract Utility Functions | ✅ |

The signal code is now **clean, DRY, type-safe, and easily extensible**.
