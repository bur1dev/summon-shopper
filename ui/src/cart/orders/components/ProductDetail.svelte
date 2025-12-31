<script lang="ts">
  import { ArrowLeft, Camera, Package } from "lucide-svelte";
  import TauriBarcodeScanner from "../../components/TauriBarcodeScanner.svelte";
  import { sendItemScanned, updateCartItemScanStatus, SCAN_STATUS, ScanStatusIcon, isStatusFound, isStatusNotFound } from "../../../signals";
  import type { AppClient, CellId } from "@holochain/client";

  // Props
  export let product: any;
  export let onBack: () => void;
  export let client: AppClient | null = null;
  export let cellId: CellId | null = null;

  // Scanner state
  let scannerActive = false;
  let scanFeedback = '';
  let scanFeedbackType: 'success' | 'error' | '' = '';
  let isUpdating = false;

  // Get scan status from product (from link tag via backend)
  $: scanStatus = product.scan_status ?? SCAN_STATUS.PENDING;
  $: isFound = isStatusFound(scanStatus);
  $: isNotFound = isStatusNotFound(scanStatus);

  // Create array with just this product's UPC for validation
  $: targetUPCs = product.upc ? [product.upc] : [];

  console.log(`[PRODUCT DETAIL] Product: ${product.product_name}`);
  console.log(`[PRODUCT DETAIL] UPC: ${product.upc || 'MISSING'}`);
  console.log(`[PRODUCT DETAIL] Scan Status: ${scanStatus}`);

  // Mark item as scanned in Holochain + send signal to customer
  async function markItemScanned(status: number) {
    if (!client || !cellId || isUpdating) return;

    isUpdating = true;
    try {
      // Call zome to persist scan status
      await client.callZome({
        cell_id: cellId,
        zome_name: 'cart',
        fn_name: 'mark_item_scanned',
        payload: {
          product_id: product.product_id,
          scan_status: status,
        },
      });

      // Update local store for reactive UI
      updateCartItemScanStatus(product.product_id, status);

      // Send signal to customer
      const signalStatus = status === SCAN_STATUS.FOUND ? 'found' : 'not_found';
      await sendItemScanned(client, cellId, product.product_id, signalStatus);

      console.log(`[SCANNER] Marked item as ${signalStatus}:`, product.product_name);

      // Update local feedback
      if (status === SCAN_STATUS.FOUND) {
        scanFeedback = `✅ ${product.product_name} confirmed!`;
        scanFeedbackType = 'success';
      } else {
        scanFeedback = `❌ ${product.product_name} marked as not found`;
        scanFeedbackType = 'error';
      }
    } catch (err) {
      console.error('[SCANNER] Failed to mark item:', err);
      scanFeedback = 'Failed to update scan status';
      scanFeedbackType = 'error';
    } finally {
      isUpdating = false;
    }
  }

  // Scanner functions
  function openScanner() {
    console.log('[SCANNER] Opening scanner for product:', product.product_name);
    scanFeedback = '';
    scanFeedbackType = '';
    scannerActive = true;
  }

  function closeScanner() {
    console.log('[SCANNER] Closing scanner');
    scannerActive = false;
  }

  async function handleScanSuccess(event: CustomEvent) {
    const { upc, message } = event.detail;
    console.log(`[SCANNER] Scan success for product: ${message}`);

    // Mark as found in backend + send signal
    await markItemScanned(SCAN_STATUS.FOUND);

    // Auto-close scanner after success
    setTimeout(() => {
      closeScanner();
    }, 2000);
  }

  function handleScanError(event: CustomEvent) {
    const { upc, message } = event.detail;
    console.log(`[SCANNER] Scan error: ${message}`);
    scanFeedback = `❌ Wrong item. Expected: ${product.product_name}`;
    scanFeedbackType = 'error';

    // Keep scanner open for retry
  }

  // Handle manual "Not Found" button
  async function handleNotFound() {
    await markItemScanned(SCAN_STATUS.NOT_FOUND);
  }

  // Handle "Mark as Found" (for reversing not_found or manual confirmation)
  async function handleMarkFound() {
    await markItemScanned(SCAN_STATUS.FOUND);
  }
</script>

<div class="product-detail-view">
  <!-- Header with back button -->
  <div class="detail-header">
    <button class="back-button" on:click={onBack}>
      <ArrowLeft size={24} />
    </button>
    <div class="product-info">
      <h1>Scan Product</h1>
      <p class="product-subtitle">Verify item for collection</p>
    </div>
    {#if isFound || isNotFound}
      <div class="scanned-indicator">
        <ScanStatusIcon status={scanStatus} size={24} />
      </div>
    {/if}
  </div>

  <!-- Product Card -->
  <div class="product-card">
    <div class="product-image">
      <img src={product.product_image_url || ''} alt={product.product_name} />
    </div>

    <div class="product-details">
      <h2>{product.product_name}</h2>
      <div class="product-meta">
        <p class="quantity">Quantity: {product.quantity ?? 0}{product.sold_by === "WEIGHT" ? " lbs" : ""}</p>
        <p class="price">${(product.price_at_checkout ?? 0).toFixed(2)}</p>
      </div>
      
      {#if product.note}
        <div class="customer-note">
          <strong>Customer Note:</strong>
          <p>{product.note}</p>
        </div>
      {/if}
    </div>
  </div>

  <!-- Scan Button -->
  <div class="scan-section">
    {#if isFound}
      <!-- Item found -->
      <div class="scan-complete">
        <ScanStatusIcon status={SCAN_STATUS.FOUND} size={48} />
        <h3>Item Confirmed!</h3>
        <p>This product has been verified</p>
        <div class="action-buttons">
          <button class="rescan-button" on:click={openScanner} disabled={isUpdating || !product.upc}>
            Scan Again
          </button>
          <button class="not-found-button" on:click={handleNotFound} disabled={isUpdating}>
            Mark Not Found
          </button>
        </div>
      </div>
    {:else if isNotFound}
      <!-- Item not found -->
      <div class="scan-not-found">
        <ScanStatusIcon status={SCAN_STATUS.NOT_FOUND} size={48} />
        <h3>Item Not Found</h3>
        <p>This product is marked as unavailable</p>
        <div class="action-buttons">
          <button class="found-button" on:click={handleMarkFound} disabled={isUpdating}>
            Mark as Found
          </button>
          {#if product.upc}
            <button class="rescan-button" on:click={openScanner} disabled={isUpdating}>
              Scan to Verify
            </button>
          {/if}
        </div>
      </div>
    {:else if product.upc}
      <!-- Pending with UPC - can scan -->
      <button class="scan-button" on:click={openScanner} disabled={isUpdating}>
        <Camera size={24} />
        <span>Scan Product Barcode</span>
      </button>
      <p class="scan-instructions">
        Scan the barcode to confirm you have the correct item
      </p>
      <div class="action-buttons">
        <button class="test-scan-button" on:click={handleMarkFound} disabled={isUpdating}>
          TEST SCAN
        </button>
        <button class="not-found-button-secondary" on:click={handleNotFound} disabled={isUpdating}>
          Item Not Available
        </button>
      </div>
    {:else}
      <!-- Pending without UPC - manual only -->
      <div class="no-scan-available">
        <Package size={48} color="#757575" />
        <h3>Manual Verification</h3>
        <p>No barcode available for this item.<br>Please verify manually.</p>
        <div class="action-buttons">
          <button class="manual-confirm-button" on:click={handleMarkFound} disabled={isUpdating}>
            Mark as Found
          </button>
          <button class="not-found-button" on:click={handleNotFound} disabled={isUpdating}>
            Not Available
          </button>
        </div>
      </div>
    {/if}
  </div>

  <!-- Scan Feedback -->
  {#if scanFeedback}
    <div class="scan-feedback {scanFeedbackType}">
      {scanFeedback}
    </div>
  {/if}
</div>

<!-- Barcode Scanner Component -->
<TauriBarcodeScanner 
  isActive={scannerActive}
  targetUPCs={targetUPCs}
  on:scan-success={handleScanSuccess}
  on:scan-error={handleScanError}
  on:close={closeScanner}
/>

<style>
  .product-detail-view {
    height: 100%;
    display: flex;
    flex-direction: column;
    background-color: var(--surface);
  }

  .detail-header {
    display: flex;
    align-items: center;
    padding: var(--spacing-md);
    background: linear-gradient(135deg, var(--primary), var(--secondary));
    color: var(--button-text);
    gap: var(--spacing-md);
  }

  .back-button {
    background: rgba(255, 255, 255, 0.2);
    color: var(--button-text);
    border: 1px solid rgba(255, 255, 255, 0.3);
    border-radius: 50%;
    padding: var(--spacing-xs);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: var(--btn-transition);
  }

  .back-button:hover {
    background: rgba(255, 255, 255, 0.3);
  }

  .product-info {
    flex: 1;
  }

  .product-info h1 {
    margin: 0;
    font-size: var(--btn-font-size-lg);
    font-weight: var(--font-weight-bold);
  }

  .product-subtitle {
    margin: 0;
    font-size: var(--font-size-sm);
    opacity: 0.9;
  }

  .scanned-indicator {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .product-card {
    background: var(--background);
    margin: var(--spacing-lg);
    border-radius: var(--card-border-radius);
    padding: var(--spacing-lg);
    box-shadow: var(--shadow-medium);
    display: flex;
    gap: var(--spacing-lg);
    align-items: flex-start;
  }

  .product-image {
    width: 120px;
    height: 120px;
    border-radius: var(--card-border-radius);
    overflow: hidden;
    flex-shrink: 0;
  }

  .product-image img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .product-details {
    flex: 1;
  }

  .product-details h2 {
    margin: 0 0 var(--spacing-md) 0;
    font-size: var(--btn-font-size-md);
    font-weight: var(--font-weight-semibold);
    color: var(--text-primary);
    line-height: 1.3;
  }

  .product-meta {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--spacing-md);
  }

  .quantity {
    margin: 0;
    font-size: var(--font-size-md);
    color: var(--text-secondary);
    font-weight: var(--font-weight-semibold);
  }

  .price {
    margin: 0;
    font-size: var(--btn-font-size-md);
    color: var(--primary);
    font-weight: var(--font-weight-bold);
  }

  .customer-note {
    background: var(--surface);
    padding: var(--spacing-sm);
    border-radius: 6px;
    border-left: 3px solid var(--primary);
    margin-bottom: var(--spacing-md);
  }

  .customer-note strong {
    color: var(--text-primary);
    font-size: var(--font-size-sm);
  }

  .customer-note p {
    margin: 4px 0 0 0;
    color: var(--text-secondary);
    font-size: var(--font-size-sm);
    line-height: 1.4;
  }

  .scan-section {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: var(--spacing-xl);
    text-align: center;
  }

  .scan-button {
    background: linear-gradient(135deg, var(--primary), var(--secondary));
    color: var(--button-text);
    border: none;
    border-radius: var(--btn-border-radius-round);
    padding: var(--spacing-lg) var(--spacing-xl);
    font-size: var(--btn-font-size-md);
    font-weight: var(--font-weight-semibold);
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: var(--spacing-md);
    transition: var(--btn-transition);
    box-shadow: var(--shadow-medium);
  }

  .scan-button:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-large);
  }

  .scan-instructions {
    margin-top: var(--spacing-md);
    color: var(--text-secondary);
    font-size: var(--font-size-sm);
    max-width: 300px;
  }

  .scan-complete {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--spacing-md);
  }

  .scan-complete h3 {
    margin: 0;
    color: #4caf50;
    font-size: var(--btn-font-size-md);
  }

  .scan-complete p {
    margin: 0;
    color: var(--text-secondary);
    font-size: var(--font-size-sm);
  }

  .rescan-button {
    background: var(--surface);
    color: var(--text-primary);
    border: 1px solid var(--border);
    border-radius: var(--btn-border-radius);
    padding: var(--spacing-sm) var(--spacing-md);
    font-size: var(--font-size-sm);
    cursor: pointer;
    transition: var(--btn-transition);
  }

  .rescan-button:hover {
    background: var(--background);
  }

  .no-scan-available {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--spacing-md);
  }

  .no-scan-available h3 {
    margin: 0;
    color: var(--text-primary);
    font-size: var(--btn-font-size-md);
  }

  .no-scan-available p {
    margin: 0;
    color: var(--text-secondary);
    font-size: var(--font-size-sm);
    line-height: 1.4;
  }

  .manual-confirm-button {
    background: #4caf50;
    color: white;
    border: none;
    border-radius: var(--btn-border-radius);
    padding: var(--spacing-md) var(--spacing-lg);
    font-size: var(--font-size-md);
    font-weight: var(--font-weight-semibold);
    cursor: pointer;
    transition: var(--btn-transition);
  }

  .manual-confirm-button:hover {
    background: #45a049;
    transform: translateY(-1px);
  }

  /* Scan Feedback */
  .scan-feedback {
    position: fixed;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    padding: var(--spacing-md) var(--spacing-lg);
    border-radius: var(--card-border-radius);
    font-weight: var(--font-weight-semibold);
    z-index: 1000;
    max-width: 300px;
    text-align: center;
    animation: slideUp 0.3s ease-out;
  }

  .scan-feedback.success {
    background: #4caf50;
    color: white;
  }

  .scan-feedback.error {
    background: #f44336;
    color: white;
  }

  @keyframes slideUp {
    from {
      opacity: 0;
      transform: translateX(-50%) translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateX(-50%) translateY(0);
    }
  }

  /* Action buttons container */
  .action-buttons {
    display: flex;
    gap: var(--spacing-md);
    margin-top: var(--spacing-md);
  }

  /* Not found button (red) */
  .not-found-button {
    background: #f44336;
    color: white;
    border: none;
    border-radius: var(--btn-border-radius);
    padding: var(--spacing-sm) var(--spacing-md);
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-semibold);
    cursor: pointer;
    transition: var(--btn-transition);
  }

  .not-found-button:hover:not(:disabled) {
    background: #d32f2f;
    transform: translateY(-1px);
  }

  .not-found-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  /* Test scan button (for testing signals without Tauri) */
  .test-scan-button {
    background: #2196f3;
    color: white;
    border: none;
    border-radius: var(--btn-border-radius);
    padding: var(--spacing-sm) var(--spacing-md);
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-bold);
    cursor: pointer;
    transition: var(--btn-transition);
  }

  .test-scan-button:hover:not(:disabled) {
    background: #1976d2;
    transform: translateY(-1px);
  }

  .test-scan-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  /* Secondary not found button (for pending state) */
  .not-found-button-secondary {
    background: transparent;
    color: var(--text-secondary);
    border: 1px solid var(--border);
    border-radius: var(--btn-border-radius);
    padding: var(--spacing-sm) var(--spacing-md);
    font-size: var(--font-size-sm);
    cursor: pointer;
    transition: var(--btn-transition);
  }

  .not-found-button-secondary:hover:not(:disabled) {
    background: var(--surface);
    color: #f44336;
    border-color: #f44336;
  }

  .not-found-button-secondary:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  /* Found button (green) */
  .found-button {
    background: #4caf50;
    color: white;
    border: none;
    border-radius: var(--btn-border-radius);
    padding: var(--spacing-sm) var(--spacing-md);
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-semibold);
    cursor: pointer;
    transition: var(--btn-transition);
  }

  .found-button:hover:not(:disabled) {
    background: #45a049;
    transform: translateY(-1px);
  }

  .found-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  /* Not found state container */
  .scan-not-found {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--spacing-md);
  }

  .scan-not-found h3 {
    margin: 0;
    color: #f44336;
    font-size: var(--btn-font-size-md);
  }

  .scan-not-found p {
    margin: 0;
    color: var(--text-secondary);
    font-size: var(--font-size-sm);
  }

  /* Disabled states for scan button */
  .scan-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .rescan-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .manual-confirm-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
</style>