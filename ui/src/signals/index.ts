/**
 * Signals module - Real-time customer-shopper communication
 *
 * Re-exports shared signal functionality + app-specific cart store.
 */

// ============================================================================
// SHARED EXPORTS (from symlinked files)
// ============================================================================

// Core service
export { signalService, type LocalSignal, type CartRemoteSignal } from './SignalService';

// Types
export type {
    CartProduct,
    DeliveryAddress,
    DeliveryTimeSlot,
    DeliveryTimeDisplay,
    CartRemoteSignalType,
    CartRemoteSignalPayloadMap,
    LocalSignalType,
    ItemAddedPayload,
    ItemRemovedPayload,
    NoteUpdatedPayload,
    ItemScannedPayload,
    ShopperJoinedPayload,
    DeliveryTimeChangedPayload,
    InstructionsChangedPayload,
    AddressChangedPayload,
    StatusChangedPayload,
    PeerInfo,
} from './types';

// Peer store
export {
    peerPubKey,
    peerName,
    isPeerConnected,
    peerLastSeen,
    setPeer,
    clearPeer,
    getPeerPubKey,
    hasPeer,
    getPeerPubKeyB64,
    updatePeerLastSeen,
} from './stores/peerStore';

// Signal sending helpers
export {
    sendCartSignal,
    sendCartSignalTo,
    sendShopperJoined,
    sendItemScanned,
    sendStatusChanged,
    sendNoteUpdated,
    sendItemAdded,
    sendItemRemoved,
    sendDeliveryTimeChanged,
    sendInstructionsChanged,
    sendAddressChanged,
} from './sendSignal';

// Cart client abstraction
export { CartClient } from './CartClient';
export type { SendSignalInput, SessionData, CartItem } from './CartClient';

// Utility functions
export { formatHour, formatTimeRange, formatDateLong, formatDateShort } from './utils';

// Scan status utilities
export {
    SCAN_STATUS,
    SCAN_COLORS,
    normalizeStatus,
    isStatusFound,
    isStatusNotFound,
    getScanRowStyle,
    type ScanStatusString,
    type NormalizedStatus,
} from './scanStatus';

// Scan status component
export { default as ScanStatusIcon } from './components/ScanStatusIcon.svelte';

// ============================================================================
// APP-SPECIFIC EXPORTS (shopper's cart signal handlers)
// ============================================================================

export {
    // Cart state stores
    cartItems,
    cartItemsArray,
    cartStatus,
    deliveryTime,
    deliveryAddress,
    deliveryInstructions,
    itemScanStatus,
    scannedItemsCount,
    // Actions
    initCartSignalHandlers,
    loadCartItems,
    clearCartState,
    getCartItem,
    getItemScanStatus,
    updateCartItemScanStatus,
} from './stores/cartSignalStore';
