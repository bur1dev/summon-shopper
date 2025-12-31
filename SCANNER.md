# Scanner Architecture - Product Scanning & Status Tracking

## Status: IMPLEMENTED (2025-12-30)

Real-time product scanning with visual feedback (icons + colored rows) is fully working between shopper and customer apps.

---

## Overview

The scanner feature allows shoppers to verify items while shopping. When a shopper marks an item as "found" or "not found":
1. Status is persisted to DHT (Holochain)
2. Signal is sent to customer in real-time
3. Both apps show visual feedback (icon + row color)

---

## Scan Status Values

```
SCAN_STATUS.PENDING   = 0  (default, not yet scanned)
SCAN_STATUS.FOUND     = 1  (item verified/collected)
SCAN_STATUS.NOT_FOUND = 2  (item unavailable)
```

Status is **fully reversible** - shopper can change status at any time.

---

## Architecture

### Shared Code (DRY Pattern)

All scan status code lives in ONE place and is symlinked to both apps:

```
summon-dnas/ui-shared/signals/
├── scanStatus.ts                    ← Constants + helper functions
├── components/
│   └── ScanStatusIcon.svelte        ← Reusable icon component
└── index.ts                         ← Exports everything

        │ symlinks
        ▼
┌─────────────────────────────────────────────────────────────────┐
│  summon-shopper/ui/src/signals/                                 │
│  ├── scanStatus.ts          → symlink to ui-shared              │
│  └── components/                                                │
│      └── ScanStatusIcon.svelte → symlink to ui-shared           │
├─────────────────────────────────────────────────────────────────┤
│  summon-customer/ui/src/signals/                                │
│  ├── scanStatus.ts          → symlink to ui-shared              │
│  └── components/                                                │
│      └── ScanStatusIcon.svelte → symlink to ui-shared           │
└─────────────────────────────────────────────────────────────────┘
```

### Signal Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           SHOPPER APP                                    │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  OrderDetailView.svelte                                                  │
│       │                                                                  │
│       ├── Displays product list with ScanStatusIcon + row colors         │
│       ├── Uses: getScanRowStyle(), isStatusFound(), isStatusNotFound()   │
│       │                                                                  │
│       └── ProductDetail.svelte (on product click)                        │
│                │                                                         │
│                ├── markItemScanned(SCAN_STATUS.FOUND | NOT_FOUND)        │
│                │       │                                                 │
│                │       ├── callZome('mark_item_scanned') → DHT           │
│                │       ├── updateCartItemScanStatus() → local store      │
│                │       └── sendItemScanned() → signal to customer        │
│                │                                                         │
│                └── Uses: ScanStatusIcon, SCAN_STATUS, isStatusFound()    │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                         Signal via DHT (ItemScanned)
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                           CUSTOMER APP                                   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  signalService.on('RemoteUpdate')                                        │
│       │                                                                  │
│       ▼                                                                  │
│  cartSignalStore.ts → handleItemScanned()                                │
│       │                                                                  │
│       ▼                                                                  │
│  itemScanStatus store updated (Map<productId, {status, substitute}>)     │
│       │                                                                  │
│       ├──► UnifiedCartItem.svelte                                        │
│       │         ├── ScanStatusIcon status={scanStatus}                   │
│       │         └── style={getScanRowStyle(scanStatus)}                  │
│       │                                                                  │
│       └──► OrderProductList.svelte                                       │
│                 ├── ScanStatusIcon status={...}                          │
│                 └── style={getScanRowStyle(...)}                         │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## File Reference

### Shared Utilities (Source of Truth)

| File | Purpose |
|------|---------|
| `summon-dnas/ui-shared/signals/scanStatus.ts` | `SCAN_STATUS` constants, `normalizeStatus()`, `getScanRowStyle()`, `isStatusFound()`, `isStatusNotFound()` |
| `summon-dnas/ui-shared/signals/components/ScanStatusIcon.svelte` | Renders CheckCircle (green) or XCircle (red) based on status |
| `summon-dnas/ui-shared/signals/index.ts` | Exports all scan status utilities |

### Backend (Rust/Holochain)

| File | Purpose |
|------|---------|
| `summon-dnas/cart/zomes/coordinator/cart/src/lib.rs` | `mark_item_scanned` zome function |
| `summon-dnas/cart/zomes/integrity/cart/src/cart.rs` | `CartQuantityTag` struct with `scan_status: u8` |

### Shopper App Components

| File | Purpose |
|------|---------|
| `ui/src/cart/orders/components/OrderDetailView.svelte` | Product list with icons + colored rows |
| `ui/src/cart/orders/components/ProductDetail.svelte` | Scanning UI, TEST SCAN button, mark found/not found |

### Customer App Components

| File | Purpose |
|------|---------|
| `ui/src/cart/components/UnifiedCartItem.svelte` | Cart items with icons + colored rows |
| `ui/src/cart/orders/components/OrderProductList.svelte` | Order items with icons + colored rows |

---

## Visual Design

### Status → Visual Mapping

| Status | Icon | Row Background | Left Border |
|--------|------|----------------|-------------|
| `pending` (0) | none | normal | none |
| `found` (1) | ✓ CheckCircle | `rgba(76, 175, 80, 0.1)` | `3px solid #4caf50` |
| `not_found` (2) | ✗ XCircle | `rgba(244, 67, 54, 0.1)` | `3px solid #f44336` |

### Colors (defined in scanStatus.ts)

```typescript
export const SCAN_COLORS = {
    found: '#4caf50',           // Green
    not_found: '#f44336',       // Red
    foundBg: 'rgba(76, 175, 80, 0.1)',
    notFoundBg: 'rgba(244, 67, 54, 0.1)',
} as const;
```

---

## How It Works

### 1. scanStatus.ts - Constants & Helpers

```typescript
// Constants (match backend u8 values)
export const SCAN_STATUS = {
    PENDING: 0,
    FOUND: 1,
    NOT_FOUND: 2,
} as const;

// Normalize status from any format (numeric or string)
export function normalizeStatus(status: number | string | undefined | null): NormalizedStatus {
    if (status === SCAN_STATUS.FOUND || status === 'found') return 'found';
    if (status === SCAN_STATUS.NOT_FOUND || status === 'not_found') return 'not_found';
    return 'pending';
}

// Get inline style for row coloring
export function getScanRowStyle(status: number | string | undefined | null): string {
    const normalized = normalizeStatus(status);
    if (normalized === 'found') {
        return `background-color: ${SCAN_COLORS.foundBg}; border-left: 3px solid ${SCAN_COLORS.found};`;
    }
    if (normalized === 'not_found') {
        return `background-color: ${SCAN_COLORS.notFoundBg}; border-left: 3px solid ${SCAN_COLORS.not_found};`;
    }
    return '';
}
```

### 2. ScanStatusIcon.svelte - Reusable Component

```svelte
<script lang="ts">
  import { CheckCircle, XCircle } from "lucide-svelte";
  import { normalizeStatus, SCAN_COLORS } from "../scanStatus";

  export let status: number | string | undefined | null = undefined;
  export let size: number = 16;

  $: normalized = normalizeStatus(status);
  $: isFound = normalized === 'found';
  $: isNotFound = normalized === 'not_found';
</script>

{#if isFound}
  <span class="scan-icon" style="color: {SCAN_COLORS.found}">
    <CheckCircle {size} />
  </span>
{:else if isNotFound}
  <span class="scan-icon" style="color: {SCAN_COLORS.not_found}">
    <XCircle {size} />
  </span>
{/if}
```

### 3. Usage in Components

**Shopper - OrderDetailView.svelte:**
```svelte
<script>
  import { ScanStatusIcon, getScanRowStyle } from "../../../signals";
</script>

{#each displayProducts as product}
  <button class="item-card" style={getScanRowStyle(product.scan_status)}>
    <span>{product.product_name}</span>
    <ScanStatusIcon status={product.scan_status} size={24} />
  </button>
{/each}
```

**Customer - UnifiedCartItem.svelte:**
```svelte
<script>
  import { itemScanStatus, ScanStatusIcon, getScanRowStyle } from "../../signals";

  $: scanStatus = $itemScanStatus.get(cartItem.productId)?.status;
</script>

<div class="cart-item" style={getScanRowStyle(scanStatus)}>
  <span>{product.name}</span>
  <ScanStatusIcon status={scanStatus} size={16} />
</div>
```

---

## Data Flow (Step by Step)

### Shopper Marks Item

1. **User action**: Shopper clicks "Mark as Found" in ProductDetail.svelte
2. **Call zome**: `client.callZome({ fn_name: 'mark_item_scanned', payload: { product_id, scan_status: 1 } })`
3. **DHT update**: Backend updates link tag with new scan_status
4. **Local store**: `updateCartItemScanStatus(productId, 1)` for immediate UI feedback
5. **Send signal**: `sendItemScanned(client, cellId, productId, 'found')`
6. **UI updates**: Row turns green, CheckCircle appears

### Customer Receives Signal

1. **Signal arrives**: `signalService.on('RemoteUpdate')` fires
2. **Handler called**: `handleItemScanned({ product_id, status: 'found' })`
3. **Store updated**: `itemScanStatus.set(productId, { status: 'found' })`
4. **UI reacts**: Components subscribed to `$itemScanStatus` re-render
5. **Visual change**: Row turns green, CheckCircle appears

---

## Backend Reference

### CartQuantityTag Structure

```rust
pub struct CartQuantityTag {
    pub quantity: f64,      // 8 bytes
    pub timestamp: u64,     // 8 bytes
    pub scan_status: u8,    // 1 byte (0=pending, 1=found, 2=not_found)
    // Total: 17 bytes
}
```

### mark_item_scanned Zome Function

```rust
#[derive(Serialize, Deserialize, Debug)]
pub struct MarkItemScannedInput {
    pub product_id: String,
    pub scan_status: u8,
}

#[hdk_extern]
pub fn mark_item_scanned(input: MarkItemScannedInput) -> ExternResult<ActionHash>
```

---

## Imports Cheat Sheet

### From Shopper/Customer App

```typescript
// Everything you need for scan status
import {
    // Constants
    SCAN_STATUS,
    SCAN_COLORS,
    // Helpers
    normalizeStatus,
    isStatusFound,
    isStatusNotFound,
    getScanRowStyle,
    // Component
    ScanStatusIcon,
    // Store (for customer receiving signals)
    itemScanStatus,
    updateCartItemScanStatus,
} from "../../signals";  // or "../../../signals" depending on depth
```

---

## Testing Checklist

- [x] Shopper can mark item as "found" (TEST SCAN button)
- [x] Shopper can mark item as "not found"
- [x] Shopper can reverse status (found ↔ not_found ↔ pending)
- [x] Customer sees real-time icon updates
- [x] Customer sees real-time row color changes
- [x] Shopper sees icon updates in OrderDetailView
- [x] Shopper sees row color changes in OrderDetailView
- [x] Status persists after reload (DHT)
- [x] ScanStatusIcon component works with numeric AND string status
- [x] Code is DRY (single source in ui-shared)

---

## Future Enhancements

- **Substitutions**: Shopper suggests replacement products
- **Customer approval**: Customer confirms/rejects substitutions
- **Quantity adjustments**: Shopper adjusts weight for WEIGHT items
- **Photo verification**: Shopper takes photo of scanned item
- **Barcode scanning**: Confirm everything works on the Android Device (TAURI)
