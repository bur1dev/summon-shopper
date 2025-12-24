<script lang="ts">
  import { MapPin, Clock, User } from "lucide-svelte";
  import OrderProductList from "./OrderProductList.svelte";
  import "@holochain-open-dev/profiles/dist/elements/agent-avatar.js";

  // Props
  export let item: any;
  export let onOrderClick: (order: any) => void;

  // Customer pub key for agent-avatar component
  const customerPubKeyB64 = item.customerPubKey;
  

  // Format status for display
  function formatStatus(status: any): string {
    switch (status) {
      case "processing":
        return "Processing";
      case "completed":
        return "Completed";
      case "returned":
        return "Returned to Cart";
      default:
        return status;
    }
  }
</script>

<div class="cart-card scale-in" on:click={() => onOrderClick(item)} on:keydown={(e) => e.key === 'Enter' && onOrderClick(item)} role="button" tabindex="0">
  <div class="cart-header">
    <div class="order-info">
      {#if item.total}
        {@const estimatedTax = Math.round(item.total * 0.0775 * 100) / 100}
        {@const orderTotal = item.total + estimatedTax}
        <h2>Order ${orderTotal.toFixed(2)}</h2>
        <div class="cart-pricing">
          <span class="subtotal">Items: ${item.total.toFixed(2)}</span>
          <span class="tax">Tax: ${estimatedTax.toFixed(2)}</span>
        </div>
      {:else}
        <h2>Order</h2>
      {/if}
      <div class="cart-date">{item.createdAt}</div>
      <div class="cart-status status-{item.status}">
        Status: {formatStatus(item.status)}
      </div>
    </div>

    <div class="customer-section">
      <div class="customer-name">
        <span class="customer-label">Customer</span>
      </div>
      <div class="customer-avatar-small">
        {#if customerPubKeyB64}
          <agent-avatar
            size={40}
            agent-pub-key={customerPubKeyB64}
            disable-tooltip={false}
            disable-copy={true}
          ></agent-avatar>
        {:else}
          <div class="avatar-placeholder-small">
            <User size={16} />
          </div>
        {/if}
      </div>
    </div>
  </div>

  {#if item.deliveryAddress || item.deliveryTime}
    <div class="delivery-details">
      {#if item.deliveryAddress}
        {@const address = item.deliveryAddress}
        <div class="delivery-address">
          <div class="delivery-icon">
            <MapPin size={16} />
          </div>
          <div class="delivery-content">
            <div class="delivery-label">Delivery Address:</div>
            <div class="address-line">
              {address.street}
              {#if address.unit}
                <span class="unit"> {address.unit}</span>
              {/if}
            </div>
            <div class="address-line">
              {address.city}, {address.state}
              {address.zip}
            </div>
          </div>
        </div>
      {/if}

      {#if item.deliveryTime}
        <div class="delivery-time">
          <div class="delivery-icon">
            <Clock size={16} />
          </div>
          <div class="delivery-content">
            <div class="delivery-label">Delivery Time:</div>
            <div>
              {#if item.deliveryTime.date && item.deliveryTime.time}
                {item.deliveryTime.date} at {item.deliveryTime.time}
              {:else if item.deliveryTime.display}
                {item.deliveryTime.display}
              {:else}
                Not specified
              {/if}
            </div>
          </div>
        </div>
      {/if}

      {#if item.deliveryInstructions}
        <div class="delivery-instructions">
          <div class="delivery-label">Instructions:</div>
          <div>{item.deliveryInstructions}</div>
        </div>
      {/if}
    </div>
  {/if}

  <OrderProductList products={item.products} />
</div>

<style>
  .cart-card {
    background: var(--background);
    border-radius: var(--card-border-radius);
    box-shadow: var(--shadow-medium);
    overflow: hidden;
    display: flex;
    flex-direction: column;
    transition: var(--card-transition);
    cursor: pointer;
  }

  .cart-card:hover {
    transform: translateY(var(--hover-lift));
    box-shadow: var(--shadow-medium);
  }

  .scale-in {
    animation: scaleIn var(--transition-normal) ease forwards;
  }

  .cart-header {
    padding: var(--spacing-md);
    border-bottom: var(--border-width-thin) solid var(--border);
    background: linear-gradient(
      135deg,
      rgba(255, 115, 0, 0.1),
      rgba(233, 30, 99, 0.1)
    );
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
  }

  .order-info {
    flex: 1;
  }

  .cart-header h2 {
    margin: 0;
    font-size: var(--btn-font-size-lg);
    font-weight: var(--font-weight-semibold);
    color: var(--text-primary);
  }

  .cart-date {
    font-size: var(--font-size-sm);
    color: var(--text-secondary);
    margin-top: 4px;
  }

  .cart-status {
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-semibold);
    margin-top: 4px;
  }

  .cart-pricing {
    display: flex;
    font-size: var(--font-size-sm);
    color: var(--text-secondary);
    gap: var(--spacing-sm);
    margin-top: 4px;
  }


  .status-processing {
    color: var(--warning);
  }

  .status-completed {
    color: var(--success);
  }

  .status-returned {
    color: var(--text-secondary);
  }

  .delivery-details {
    padding: var(--spacing-md);
    background-color: var(--surface);
    border-bottom: var(--border-width-thin) solid var(--border);
  }

  .delivery-address,
  .delivery-time {
    display: flex;
    margin-bottom: var(--spacing-sm);
  }

  .delivery-icon {
    margin-right: var(--spacing-sm);
    color: var(--primary);
  }

  :global(.delivery-icon svg) {
    color: var(--primary);
    stroke: var(--primary);
  }

  .delivery-content {
    flex: 1;
  }

  .delivery-label {
    font-weight: var(--font-weight-semibold);
    margin-bottom: 4px;
    font-size: var(--font-size-sm);
    color: var(--text-primary);
  }

  .address-line {
    font-size: var(--font-size-sm);
    color: var(--text-secondary);
    line-height: 1.4;
  }


  .delivery-instructions {
    margin-top: var(--spacing-sm);
    font-size: var(--font-size-sm);
    color: var(--text-secondary);
    background-color: var(--surface);
    padding: var(--spacing-xs) var(--spacing-sm);
    border-radius: var(--btn-border-radius-round);
    border-left: var(--border-width) solid var(--primary);
  }

  .customer-section {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--spacing-xs);
    margin-left: var(--spacing-md);
  }

  .customer-avatar-small {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    overflow: hidden;
    flex-shrink: 0;
    background: var(--surface);
    display: flex;
    align-items: center;
    justify-content: center;
    border: var(--border-width) solid var(--primary);
    box-shadow: var(--shadow-subtle);
    transition: var(--btn-transition);
    padding: 2px;
  }

  .avatar-image-small {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .avatar-placeholder-small {
    color: var(--primary);
    opacity: 0.8;
  }

  .customer-avatar-small:hover {
    transform: scale(var(--hover-scale));
    box-shadow: var(--shadow-medium);
  }

  .customer-name {
    display: flex;
    flex-direction: column;
    gap: 2px;
    text-align: center;
  }

  .customer-label {
    font-size: var(--font-size-xs);
    color: var(--text-tertiary);
    font-weight: var(--font-weight-medium);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .customer-value {
    font-size: var(--font-size-sm);
    color: var(--text-primary);
    font-weight: var(--font-weight-semibold);
  }

  /* Mobile responsive adjustments */
  @media (max-width: 768px) {
    .cart-header {
      flex-direction: column;
      gap: var(--spacing-sm);
    }
    
    .customer-section {
      flex-direction: row;
      align-items: center;
      justify-content: flex-start;
      margin-left: 0;
      gap: var(--spacing-sm);
    }
    
    .customer-avatar-small {
      width: 32px;
      height: 32px;
    }
    
    .customer-name {
      text-align: left;
    }
    
    .cart-pricing {
      flex-direction: column;
      gap: 2px;
    }
    
    .delivery-details {
      padding: var(--spacing-sm);
    }
  }
</style>