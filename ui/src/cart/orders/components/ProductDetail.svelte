<script lang="ts">
  import { ArrowLeft, Camera, Package, CheckCircle } from "lucide-svelte";
  import TauriBarcodeScanner from "../../components/TauriBarcodeScanner.svelte";

  // Props
  export let product: any;
  export let onBack: () => void;

  // Scanner state
  let scannerActive = false;
  let scanFeedback = '';
  let scanFeedbackType: 'success' | 'error' | '' = '';
  let isScanned = false;

  // Create array with just this product's UPC for validation
  const targetUPCs = product.upc ? [product.upc] : [];

  console.log(`[PRODUCT DETAIL] Product: ${product.product_name}`);
  console.log(`[PRODUCT DETAIL] UPC: ${product.upc || 'MISSING'}`);
  console.log(`[PRODUCT DETAIL] Target UPCs for scanning:`, targetUPCs);

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

  function handleScanSuccess(event: CustomEvent) {
    const { upc, message } = event.detail;
    console.log(`[SCANNER] Scan success for product: ${message}`);
    scanFeedback = `✅ ${product.product_name} confirmed!`;
    scanFeedbackType = 'success';
    isScanned = true;
    
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
    {#if isScanned}
      <div class="scanned-indicator">
        <CheckCircle size={24} color="#4caf50" />
      </div>
    {/if}
  </div>

  <!-- Product Card -->
  <div class="product-card">
    <div class="product-image">
      <img src={product.product_image_url} alt={product.product_name} />
    </div>

    <div class="product-details">
      <h2>{product.product_name}</h2>
      <div class="product-meta">
        <p class="quantity">Quantity: {product.quantity}</p>
        <p class="price">${product.price_at_checkout.toFixed(2)}</p>
      </div>
      
      {#if product.note}
        <div class="customer-note">
          <strong>Customer Note:</strong>
          <p>{product.note}</p>
        </div>
      {/if}

      {#if product.upc}
        <div class="upc-info">
          <strong>UPC:</strong> <code>{product.upc}</code>
        </div>
      {:else}
        <div class="no-upc-warning">
          ⚠️ No UPC available for this product
        </div>
      {/if}
    </div>
  </div>

  <!-- Scan Button -->
  <div class="scan-section">
    {#if !isScanned && product.upc}
      <button class="scan-button" on:click={openScanner}>
        <Camera size={24} />
        <span>Scan Product Barcode</span>
      </button>
      <p class="scan-instructions">
        Scan the barcode to confirm you have the correct item
      </p>
    {:else if isScanned}
      <div class="scan-complete">
        <CheckCircle size={48} color="#4caf50" />
        <h3>Item Confirmed!</h3>
        <p>This product has been successfully scanned</p>
        <button class="rescan-button" on:click={() => { isScanned = false; openScanner(); }}>
          Scan Again
        </button>
      </div>
    {:else}
      <div class="no-scan-available">
        <Package size={48} color="#757575" />
        <h3>Manual Verification</h3>
        <p>No barcode available for this item.<br>Please verify manually.</p>
        <button class="manual-confirm-button" on:click={() => { isScanned = true; }}>
          Mark as Collected
        </button>
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

  .upc-info {
    font-size: var(--font-size-sm);
    color: var(--text-secondary);
  }

  .upc-info code {
    background: var(--surface);
    padding: 2px 6px;
    border-radius: 4px;
    font-family: monospace;
    font-size: var(--font-size-xs);
    color: var(--text-primary);
  }

  .no-upc-warning {
    font-size: var(--font-size-sm);
    color: #f44336;
    font-weight: var(--font-weight-semibold);
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
</style>