<script lang="ts">
  // Props
  export let products: any[] = [];
</script>

<div class="cart-items">
  {#each products as product}
    <div class="cart-product">
      <div class="product-image">
        {#if product.product_image_url}
          <img
            src={product.product_image_url}
            alt={product.product_name}
          />
        {/if}
      </div>
      <div class="product-details">
        <div class="product-name">
          {product.product_name || "Unknown Product"}
        </div>
        <div class="product-size">
          {product.sold_by === "WEIGHT" ? "/lb" : "each"}
        </div>
        <div class="product-quantity">
          {product.quantity}{product.sold_by === "WEIGHT" ? " lbs" : ""} × ${(
            product.price_at_checkout || 0
          ).toFixed(2)}
        </div>
        {#if product.note}
          <div class="shopper-note">
            Shopper note: {product.note}
          </div>
        {/if}
      </div>
      <div class="product-price">
        ${(
          (product.price_at_checkout || 0) * product.quantity
        ).toFixed(2)}
      </div>
    </div>
  {/each}
</div>

<style>
  .cart-items {
    padding: var(--spacing-md);
    overflow-y: auto;
    max-height: 300px;
    flex: 1;
  }

  .cart-product {
    display: flex;
    padding: var(--spacing-sm) 0;
    border-bottom: var(--border-width-thin) solid var(--border);
    align-items: center;
  }

  .product-image {
    width: 70px;
    height: 70px;
    margin-right: var(--spacing-md);
    flex-shrink: 0;
    overflow: hidden;
    border-radius: var(--card-border-radius);
  }

  .product-image img {
    width: 100%;
    height: 100%;
    object-fit: contain;
    object-position: top;
  }

  .product-details {
    flex: 1;
    min-width: 0;
  }

  .product-name {
    font-weight: var(--font-weight-semibold);
    margin-bottom: 4px;
    font-size: var(--font-size-md);
    color: var(--text-primary);
  }

  .product-size {
    color: var(--text-secondary);
    font-size: var(--font-size-sm);
    margin-bottom: 2px;
  }

  .product-quantity {
    font-size: var(--font-size-sm);
    color: var(--primary);
    font-weight: var(--font-weight-semibold);
  }

  .product-price {
    font-weight: var(--font-weight-semibold);
    font-size: var(--font-size-md);
    margin-left: var(--spacing-sm);
    color: var(--text-primary);
  }

  .shopper-note {
    font-size: var(--font-size-sm);
    color: var(--text-secondary);
    margin-top: 4px;
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
</style>