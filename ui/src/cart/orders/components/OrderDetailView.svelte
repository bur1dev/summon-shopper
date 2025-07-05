<script lang="ts">
  import { ArrowLeft, MapPin, Clock, Package, User } from "lucide-svelte";
  import ProductDetail from "./ProductDetail.svelte";

  // Props (Svelte 4 way)
  export let order: any;
  export let onBack: () => void;

  // View state
  let currentView = 'order'; // 'order' | 'product'
  let selectedProduct: any = null;

  // Extract customer information from the order
  const customerName = order.customerName || "Customer";
  const customerProfile = order.customerProfile;
  const deliveryAddress = order.deliveryAddress;
  const deliveryTime = order.deliveryTime;
  
  console.log("🔍 ORDER DETAIL: Customer profile:", customerProfile);
  console.log("🔍 ORDER DETAIL: Order products with notes:", order.products.map((p: any) => ({
    name: p.productName,
    note: p.note,
    noteType: typeof p.note,
    noteLength: p.note ? p.note.length : 'no note'
  })));

  // Navigation functions
  function openProductDetail(product: any) {
    console.log('[NAVIGATION] Opening product detail for:', product.productName);
    selectedProduct = product;
    currentView = 'product';
  }

  function backToOrderDetail() {
    console.log('[NAVIGATION] Back to order detail');
    currentView = 'order';
    selectedProduct = null;
  }
</script>

{#if currentView === 'order'}
<div class="order-detail-view">
  <!-- Header with back button -->
  <div class="detail-header">
    <button class="back-button" on:click={onBack}>
      <ArrowLeft size={24} />
    </button>
    <div class="customer-info">
      <div class="customer-avatar">
        {#if customerProfile?.avatar}
          <img src={customerProfile.avatar} alt={customerName} class="avatar-image" />
        {:else}
          <div class="avatar-placeholder">
            <User size={24} />
          </div>
        {/if}
      </div>
      <div class="customer-details">
        <h1>{customerName}'s Order</h1>
        {#if customerProfile?.agentPubKey}
          <p class="customer-id">ID: {customerProfile.agentPubKey.slice(0, 12)}...</p>
        {/if}
      </div>
    </div>
  </div>

  <!-- Order Info Section -->
  <div class="order-info">
    <div class="info-card">
      <div class="info-item">
        <MapPin size={20} />
        <div>
          <p class="info-label">Delivery Address</p>
          <p class="info-value">
            {deliveryAddress.street}<br>
            {deliveryAddress.city}, {deliveryAddress.state} {deliveryAddress.zip_code}
          </p>
        </div>
      </div>
      
      {#if deliveryTime}
        <div class="info-item">
          <Clock size={20} />
          <div>
            <p class="info-label">Delivery Time</p>
            <p class="info-value">{deliveryTime.time}</p>
          </div>
        </div>
      {/if}
      
      <div class="info-item">
        <Package size={20} />
        <div>
          <p class="info-label">Total Items</p>
          <p class="info-value">{order.products.length} items</p>
        </div>
      </div>

      {#if order.deliveryInstructions}
        <div class="delivery-instructions">
          <div class="delivery-label">Instructions:</div>
          <div>{order.deliveryInstructions}</div>
        </div>
      {/if}
    </div>
  </div>

  <!-- Items List -->
  <div class="items-section">
    <h2>Items to Collect</h2>
    <div class="items-list">
      {#each order.products as product}
        <button class="item-card clickable" on:click={() => openProductDetail(product)}>
          <div class="item-image">
            <img src={product.productImageUrl} alt={product.productName} />
          </div>
          
          <div class="item-details">
            <h3>{product.productName}</h3>
            <p class="item-quantity">Qty: {product.quantity}</p>
            {#if product.note}
              <p class="item-note">Note: {product.note}</p>
            {/if}
            <p class="item-price">${product.priceAtCheckout.toFixed(2)}</p>
          </div>
          
          <div class="item-actions">
            <Package size={20} />
          </div>
        </button>
      {/each}
    </div>
  </div>

  <!-- Order Total -->
  <div class="order-total">
    <div class="total-card">
      <span class="total-label">Order Total:</span>
      <span class="total-amount">${order.total.toFixed(2)}</span>
    </div>
  </div>

</div>
{/if}

<!-- Product Detail View -->
{#if currentView === 'product' && selectedProduct}
  <ProductDetail 
    product={selectedProduct} 
    onBack={backToOrderDetail}
  />
{/if}

<style>
  .order-detail-view {
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
    position: relative;
    gap: var(--spacing-md);
  }

  .customer-info {
    display: flex;
    align-items: center;
    gap: var(--spacing-md);
    flex: 1;
  }

  .customer-avatar {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    overflow: hidden;
    background: rgba(255, 255, 255, 0.2);
    display: flex;
    align-items: center;
    justify-content: center;
    border: 2px solid rgba(255, 255, 255, 0.3);
  }

  .avatar-image {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .avatar-placeholder {
    color: var(--button-text);
    opacity: 0.8;
  }

  .customer-details {
    flex: 1;
  }

  .customer-details h1 {
    margin: 0;
    font-size: var(--btn-font-size-lg);
    font-weight: var(--font-weight-bold);
  }

  .customer-id {
    margin: var(--spacing-xs) 0 0 0;
    font-size: var(--font-size-sm);
    opacity: 0.8;
    font-family: monospace;
  }

  .back-button {
    background: rgba(255, 255, 255, 0.2);
    border: none;
    border-radius: 50%;
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    margin-right: var(--spacing-md);
    transition: var(--btn-transition);
  }

  .back-button:hover {
    background: rgba(255, 255, 255, 0.3);
    transform: scale(1.1);
  }


  .order-info {
    padding: var(--spacing-lg);
  }

  .info-card {
    background: var(--background);
    border-radius: var(--card-border-radius);
    padding: var(--spacing-md);
    box-shadow: var(--shadow-subtle);
    display: flex;
    flex-direction: column;
    gap: var(--spacing-md);
  }

  .info-item {
    display: flex;
    align-items: flex-start;
    gap: var(--spacing-sm);
  }

  .info-label {
    font-weight: var(--font-weight-semibold);
    color: var(--text-secondary);
    margin: 0 0 var(--spacing-xs) 0;
    font-size: var(--font-size-sm);
  }

  .info-value {
    margin: 0;
    color: var(--text-primary);
    line-height: 1.4;
  }

  .items-section {
    flex: 1;
    padding: 0 var(--spacing-lg);
    overflow-y: auto;
  }

  .items-section h2 {
    margin: 0 0 var(--spacing-md) 0;
    color: var(--text-primary);
    font-size: var(--btn-font-size-md);
    font-weight: var(--font-weight-semibold);
  }

  .items-list {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-md);
    padding-bottom: var(--spacing-xl);
  }

  .item-card {
    background: var(--background);
    border-radius: var(--card-border-radius);
    padding: var(--spacing-md);
    box-shadow: var(--shadow-subtle);
    display: flex;
    gap: var(--spacing-md);
    align-items: center;
    transition: var(--card-transition);
    width: 100%;
    text-align: left;
  }

  .item-card.clickable {
    border: none;
    cursor: pointer;
  }

  .item-card:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-medium);
  }

  .item-card.clickable:hover {
    background: var(--surface);
  }

  .item-image {
    width: 60px;
    height: 60px;
    border-radius: var(--card-border-radius);
    overflow: hidden;
    flex-shrink: 0;
  }

  .item-image img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .item-details {
    flex: 1;
  }

  .item-details h3 {
    margin: 0 0 var(--spacing-xs) 0;
    font-size: var(--font-size-md);
    font-weight: var(--font-weight-semibold);
    color: var(--text-primary);
  }

  .item-quantity {
    margin: 0 0 var(--spacing-xs) 0;
    font-size: var(--font-size-sm);
    color: var(--text-secondary);
    font-weight: var(--font-weight-semibold);
  }

  .item-note {
    margin: 4px 0 var(--spacing-xs) 0;
    font-size: var(--font-size-sm);
    color: var(--text-secondary);
    width: 100%;
    max-width: 100%;
    word-wrap: break-word;
    overflow-wrap: break-word;
    word-break: break-all;
    white-space: pre-wrap;
    hyphens: auto;
    background-color: var(--surface);
    padding: 4px var(--spacing-xs);
    border-radius: 4px;
    border-left: var(--border-width) solid var(--primary);
    box-sizing: border-box;
  }

  .delivery-instructions {
    margin-top: var(--spacing-sm);
    font-size: var(--font-size-sm);
    color: var(--text-secondary);
    background-color: var(--surface);
    padding: var(--spacing-xs) var(--spacing-sm);
    border-radius: var(--btn-border-radius);
    border-left: var(--border-width) solid var(--primary);
  }

  .delivery-label {
    font-weight: var(--font-weight-semibold);
    margin-bottom: 4px;
    font-size: var(--font-size-sm);
    color: var(--text-primary);
  }

  .item-price {
    margin: 0;
    font-size: var(--font-size-md);
    font-weight: var(--font-weight-bold);
    color: var(--primary);
  }

  .item-actions {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
  }


  .order-total {
    padding: var(--spacing-lg);
    border-top: 1px solid var(--border);
    background: var(--background);
  }

  .total-card {
    background: linear-gradient(135deg, var(--primary), var(--secondary));
    color: var(--button-text);
    padding: var(--spacing-md);
    border-radius: var(--card-border-radius);
    display: flex;
    justify-content: space-between;
    align-items: center;
    box-shadow: var(--shadow-medium);
  }

  .total-label {
    font-size: var(--btn-font-size-md);
    font-weight: var(--font-weight-semibold);
  }

  .total-amount {
    font-size: var(--btn-font-size-lg);
    font-weight: var(--font-weight-bold);
  }

</style>