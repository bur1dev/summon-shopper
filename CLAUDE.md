# Summon Shopper App - Development Status

## =¨ CRITICAL DEVELOPMENT STATUS (2025-08-03)

### Current State: MAJOR REFACTORING NEEDED

**L BROKEN**: Summon-shopper app is currently broken due to DNA architecture mismatch

**Root Issue**: The customer app (summon-customer) has been completely refactored to use a new clone-based cart architecture, but the shopper app is still using the old cart structure and calling functions that no longer exist.

### <× THE NEW ARCHITECTURE VISION

#### Complete Shopper-Customer Discovery System (NOT YET IMPLEMENTED)

**Two-DNA System Architecture**:

1. **`order_finder.dna`** (Per-Shopper Discovery Networks) - NOT YET CREATED
   - Each shopper creates their own private discovery network
   - Customers join via invite links and post their cart network seeds
   - Agent-specific anchors ensure perfect customer-to-customer privacy

2. **`cart.dna`** (Per-Order Sessions) - EXISTS BUT NEEDS DISCOVERY INTEGRATION
   - Each customer order creates a fresh cart.dna clone
   - Shoppers join customer cart clones using discovered network seeds
   - Real-time shopping coordination between one customer and one shopper

#### The Complete User Flow (FUTURE IMPLEMENTATION)

**Phase 1: Shopper Setup**
1. Bob (shopper) creates `order_finder.dna` clone: `"bob_smith_encinitas_finder_xyz"`
2. Bob generates invite link/QR code for his discovery network
3. Bob distributes this link: "Join Bob's grocery delivery network!"

**Phase 2: Customer Onboarding**
1. Alice sees Bob's invite, scans QR code in summon-customer app
2. Alice's app joins Bob's `order_finder.dna` clone permanently
3. Alice can now post orders to her private anchor in Bob's discovery network

**Phase 3: Order Discovery & Shopping**
1. Alice creates private `cart.dna` clone: `"alice_cart_monday_groceries_abc123"`
2. Alice fills cart, publishes cart network seed to Bob's `order_finder.dna`
3. Bob's summon-shopper queries his `order_finder.dna` ’ discovers Alice's order
4. Bob joins Alice's `cart.dna` clone using her network seed
5. Bob shops in Alice's private cart with real-time coordination

### =' IMMEDIATE DEVELOPMENT TASKS

#### Priority 1: Fix Basic Cart Functionality
**Status**: L BROKEN - summon-shopper calls non-existent functions

**Issues**:
- Calling `get_all_available_orders()` and `get_checked_out_carts()` - these functions don't exist
- Not using cart clone architecture like summon-customer
- Using old CartItem structure instead of new clone-based structure

**Needs**:
- Update to use same cart DNA functions as summon-customer: `get_current_items()`, `get_session_data()`
- Copy exact CartTypes.ts from summon-customer (with upc, soldBy, addedOrder fields)
- Implement proper cart clone joining (for now, just basic clone management)

#### Priority 2: Implement order_finder.dna
**Status**: L NOT STARTED

**Needs**:
- Create new `order_finder.dna` with OrderRequest entries and agent-specific anchors
- Add to both summon-customer and summon-shopper happ.yaml configurations
- Implement clone creation and management in both apps

**Entry Types Needed**:
```rust
#[hdk_entry_helper]
pub struct OrderRequest {
    pub customer_pubkey: AgentPubKey,
    pub customer_name: String,
    pub cart_network_seed: String,
    pub estimated_total: String,
    pub delivery_time: String,
    pub timestamp: u64,
}
```

#### Priority 3: Clone Discovery Integration
**Status**: L NOT STARTED

**Customer App Needs**:
- "Join Shopper Network" UI (paste invite link)
- "Publish Order" functionality (post cart network seed to shopper's finder)
- order_finder.dna clone management service

**Shopper App Needs**:
- "Create Discovery Network" UI (create order_finder.dna clone + generate invite)
- "Available Orders" view (query order_finder.dna for customer orders)
- "Accept Order" functionality (join customer's cart.dna clone)

### >ê TESTING STRATEGY

**Full Integration Testing Required**:
- Run summon-customer app (Alice persona)
- Run summon-shopper app (Bob persona)  
- Test complete flow: invite ’ join ’ order ’ discover ’ shop ’ deliver
- Verify privacy: customers can't see each other's orders
- Verify isolation: different shoppers can't access each other's networks

### =Ë CURRENT CAPABILITIES

####  What Works:
- **summon-customer**: Complete cart functionality with clone-based architecture
- **summon-shopper**: Basic app structure and UI components exist
- **cart.dna**: Fully functional with individual cart clone support

#### L What's Broken:
- **summon-shopper cart queries**: Calling non-existent DNA functions
- **Data structure mismatch**: Using old CartItem instead of new clone-based structure
- **No discovery system**: Can't find or join customer cart clones

#### =§ What's Missing:
- **order_finder.dna**: Entire discovery system DNA not yet created
- **Clone discovery services**: Frontend logic for managing discovery and cart clones
- **Integration testing**: End-to-end shopper-customer coordination testing

### <¯ DEVELOPMENT PRIORITY ORDER

1. **IMMEDIATE**: Fix summon-shopper cart functionality to match summon-customer
2. **NEXT**: Create order_finder.dna with OrderRequest entries and discovery functions  
3. **THEN**: Implement clone management services in both apps
4. **FINALLY**: Build complete discovery UI and test full shopper-customer flow

### = ARCHITECTURE BENEFITS

**Perfect Privacy**: Agent-specific anchors prevent customers from seeing each other's orders
**Infinite Scale**: Each shopper manages independent discovery network with 10-100 customers
**Zero Platform Fees**: Pure peer-to-peer coordination between shoppers and customers
**Cryptographic Accountability**: All participants visible via pubkeys, violations traceable

---

**Current Focus**: Getting basic cart functionality working in summon-shopper so we can then build the beautiful discovery system on top! =€