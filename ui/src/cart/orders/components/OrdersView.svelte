<script lang="ts">
  import { onMount } from "svelte";
  import { ShoppingCart, RefreshCw, TestTube } from "lucide-svelte";
  import { loadOrders, setOrdersClient } from "../../services/OrdersService";
  // ============================================================================
  // FAKE DATA IMPORTS FOR TESTING - REMOVE FOR PRODUCTION
  // ============================================================================
  import { callZome } from "../../utils/zomeHelpers";
  import { getClient } from "../../../contexts";
  import OrderCard from "./OrderCard.svelte";
  import ProfileEditor from "../../../profile/components/ProfileEditor.svelte";
  import { encodeHashToBase64 } from "@holochain/client";
  import "@holochain-open-dev/profiles/dist/elements/agent-avatar.js";

  // Props (Svelte 4 way)
  export let onOrderClick: (order: any) => void = () => {};

  // Get the client store
  const clientStore = getClient();
  let client: any;
  $: ({ client } = $clientStore);

  // Get agent pub key for avatar (Base64 encoded for agent-avatar component)
  let myAgentPubKeyB64: string | undefined;
  $: if (client && client.myPubKey) {
    myAgentPubKeyB64 = encodeHashToBase64(client.myPubKey);
  }

  // State (Svelte 4 way)
  let isLoading = true;
  let checkedOutCarts: any[] = [];
  let errorMessage = "";
  let profileEditorComponent: ProfileEditor;

  // Set up client when it becomes available (Svelte 4 way)
  $: if (client) {
    initializeClientAndLoadOrders();
  }

  async function initializeClientAndLoadOrders() {
    try {
      await setOrdersClient(client);
      await loadCheckedOutCarts();
    } catch (error) {
      console.error("Error initializing client or loading orders:", error);
      const errorMsg = error instanceof Error ? error.message : String(error);
      errorMessage = "Failed to initialize: " + errorMsg;
      isLoading = false;
    }
  }

  async function loadCheckedOutCarts() {
    try {
      isLoading = true;
      errorMessage = "";

      // Use functional OrdersService with shared order finder DNA
      const result = await loadOrders();

      if (result.success) {
        checkedOutCarts = result.data || [];
        console.log("✅ Loaded", checkedOutCarts.length, "checked out carts");
      } else {
        console.error("Error loading checked out carts:", result.message);
        errorMessage = "Error loading checked out carts: " + result.message;
        checkedOutCarts = [];
      }

      isLoading = false;
    } catch (error) {
      console.error("Error loading checked out carts:", error);
      const errorMsg = error instanceof Error ? error.message : String(error);
      errorMessage = "Error loading checked out carts: " + errorMsg;
      isLoading = false;
      checkedOutCarts = [];
    }
  }


  // Refresh orders manually
  async function refreshOrders() {
    await loadCheckedOutCarts();
  }

  // ============================================================================
  // FAKE DATA GENERATION FOR TESTING - REMOVE FOR PRODUCTION
  // ============================================================================
  // This function calls the fake order generation zome function and then
  // refreshes the orders list to show the new fake order immediately.
  async function generateFakeOrder() {
    try {
      console.log("🧪 FAKE DATA: Generating fake order with butter UPC...");
      
      // Call the zome function we created in the DNA
      const result = await callZome(client, 'cart', 'cart', 'generate_fake_order_with_butter', null);
      
      console.log("🧪 FAKE DATA: Fake order created with hash:", result);
      
      // Refresh the orders list to show the new fake order
      await loadCheckedOutCarts();
      
      console.log("🧪 FAKE DATA: Orders refreshed - fake order should now appear");
    } catch (error) {
      console.error("🧪 FAKE DATA ERROR: Failed to generate fake order:", error);
      errorMessage = "Failed to generate fake order: " + (error instanceof Error ? error.message : String(error));
    }
  }
  // ============================================================================
  // END FAKE DATA SECTION - REMOVE FOR PRODUCTION
  // ============================================================================

  // Profile editor functions
  function handleAvatarClick() {
    if (!profileEditorComponent) return;
    profileEditorComponent.open();
  }

  function handleProfileUpdated(event: CustomEvent) {
    console.log("Profile updated:", event.detail);
  }
</script>

<div class="checkout-view fade-in">
  <div class="fixed-header">
    <button class="avatar-button" on:click={handleAvatarClick} title="Edit Profile">
      {#if myAgentPubKeyB64}
        <agent-avatar 
          size={40}
          agent-pub-key={myAgentPubKeyB64}
          disable-tooltip={true}
          disable-copy={true}
        ></agent-avatar>
      {:else}
        <div class="avatar-placeholder">
          <div class="placeholder-circle"></div>
        </div>
      {/if}
    </button>
    <div class="header-content">
      <h1>Available Orders</h1>
      <p>Orders from customers that need fulfillment</p>
    </div>
    <!-- ============================================================================ -->
    <!-- FAKE DATA BUTTON FOR TESTING - REMOVE FOR PRODUCTION -->
    <!-- ============================================================================ -->
    <button class="fake-order-button" on:click={generateFakeOrder} disabled={isLoading} title="Generate Fake Order with Butter UPC">
      <TestTube size={20} />
    </button>
    <!-- ============================================================================ -->
    <!-- END FAKE DATA BUTTON - REMOVE FOR PRODUCTION -->
    <!-- ============================================================================ -->
    <button class="refresh-button" on:click={refreshOrders} disabled={isLoading} title="Refresh Orders">
      <RefreshCw size={20} class={isLoading ? "spinning" : ""} />
    </button>
  </div>

  <div class="scrollable-content">
    {#if isLoading}
      <div class="loading">Loading available orders...</div>
    {:else if errorMessage}
      <div class="error-message">{errorMessage}</div>
    {:else if checkedOutCarts.length === 0}
      <div class="empty-state scale-in">
        <ShoppingCart size={64} color="var(--border)" />
        <h2>No Available Orders</h2>
        <p>Orders from customers will appear here when they create carts.</p>
      </div>
    {:else}
      <div class="carts-grid">
        {#each checkedOutCarts as item}
          <OrderCard 
            {item} 
            {onOrderClick}
          />
        {/each}
      </div>
    {/if}
  </div>
</div>

<!-- Profile Editor Component -->
<ProfileEditor 
  bind:this={profileEditorComponent}
  on:profile-updated={handleProfileUpdated}
/>

<style>
  .checkout-view {
    width: 100%;
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 100%;
    overflow: hidden;
    padding: 0;
  }

  .checkout-view.fade-in {
    animation: fadeIn var(--transition-normal) ease forwards;
  }

  .fixed-header {
    padding: var(--spacing-md);
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: linear-gradient(135deg, var(--primary), var(--secondary));
    z-index: var(--z-index-sticky);
    box-shadow: var(--shadow-medium);
    border-bottom: none;
    position: relative;
    margin: 0;
  }

  .header-content {
    flex: 1;
    text-align: center;
  }

  .fixed-header h1 {
    font-size: var(--spacing-xl);
    margin-bottom: 0;
    color: var(--button-text);
  }

  .fixed-header p {
    color: rgba(255, 255, 255, 0.9);
    margin: 0;
    font-size: var(--font-size-md);
  }

  .network-status {
    font-size: var(--font-size-sm);
    opacity: 0.8;
    margin-top: 4px;
  }

  .avatar-button {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 48px;
    height: 48px;
    background: rgba(255, 255, 255, 0.2);
    border: none;
    border-radius: 50%;
    cursor: pointer;
    transition: var(--btn-transition);
    padding: 4px;
  }

  .avatar-button:hover {
    background: rgba(255, 255, 255, 0.3);
    transform: scale(var(--hover-scale-subtle));
  }

  .avatar-placeholder {
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .placeholder-circle {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.4);
    border: 2px solid rgba(255, 255, 255, 0.6);
  }

  /* ============================================================================ */
  /* FAKE DATA BUTTON STYLES FOR TESTING - REMOVE FOR PRODUCTION */
  /* ============================================================================ */
  .fake-order-button {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 48px;
    height: 48px;
    background: rgba(255, 193, 7, 0.3); /* Amber/warning color for testing */
    border: none;
    border-radius: 50%;
    cursor: pointer;
    transition: var(--btn-transition);
    color: var(--button-text);
    padding: 0;
    margin-right: 8px; /* Space between fake and refresh buttons */
  }

  .fake-order-button:hover:not(:disabled) {
    background: rgba(255, 193, 7, 0.5);
    transform: scale(var(--hover-scale-subtle));
  }

  .fake-order-button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  :global(.fake-order-button svg) {
    color: var(--button-text);
    stroke: var(--button-text);
  }
  /* ============================================================================ */
  /* END FAKE DATA BUTTON STYLES - REMOVE FOR PRODUCTION */
  /* ============================================================================ */

  .discovery-button {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 48px;
    height: 48px;
    background: rgba(255, 255, 255, 0.2);
    border: none;
    border-radius: 50%;
    cursor: pointer;
    transition: var(--btn-transition);
    color: var(--button-text);
    padding: 0;
    margin-right: 8px;
    font-size: 20px;
  }

  .discovery-button:hover {
    background: rgba(255, 255, 255, 0.3);
    transform: scale(var(--hover-scale-subtle));
  }

  .refresh-button {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 48px;
    height: 48px;
    background: rgba(255, 255, 255, 0.2);
    border: none;
    border-radius: 50%;
    cursor: pointer;
    transition: var(--btn-transition);
    color: var(--button-text);
    padding: 0;
  }

  .refresh-button:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.3);
    transform: scale(var(--hover-scale-subtle));
  }

  .refresh-button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  :global(.refresh-button svg) {
    color: var(--button-text);
    stroke: var(--button-text);
  }

  .scrollable-content {
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
    -webkit-overflow-scrolling: touch; /* iOS smooth scrolling */
    padding: var(--spacing-lg);
    background-color: var(--surface);
    min-height: 0; /* Allows flex child to shrink */
  }

  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: var(--spacing-xxxl) 0;
    text-align: center;
    color: var(--text-secondary);
    border-radius: var(--card-border-radius);
    box-shadow: var(--shadow-subtle);
    margin: var(--spacing-lg) auto;
    max-width: 500px;
    padding: var(--spacing-xxxl) var(--spacing-lg);
    background: var(--background);
  }

  .empty-state h2 {
    margin: var(--spacing-lg) 0 var(--spacing-sm);
    font-size: var(--spacing-lg);
    color: var(--text-primary);
  }

  .empty-state p {
    margin: 0;
  }

  .error-message {
    margin: var(--spacing-lg);
    padding: var(--spacing-md);
    background-color: rgba(211, 47, 47, 0.1);
    color: var(--error);
    border-radius: var(--card-border-radius);
    font-size: var(--font-size-sm);
    text-align: center;
    border-left: 3px solid var(--error);
  }

  .carts-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(min(100%, 400px), 1fr));
    gap: var(--spacing-lg);
    padding-bottom: var(--spacing-xl);
    max-width: 1400px;
    margin: 0 auto;
  }

  /* Mobile responsive adjustments */
  @media (max-width: 768px) {
    .carts-grid {
      grid-template-columns: 1fr;
      gap: var(--spacing-md);
      padding-bottom: var(--spacing-lg);
    }
  }

  .loading {
    display: flex;
    justify-content: center;
    padding: var(--spacing-xl);
    font-size: var(--btn-font-size-md);
    color: var(--text-secondary);
  }

  :global(.spinning) {
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  .discovery-manager-container {
    background: var(--background);
    border-radius: var(--card-border-radius);
    box-shadow: var(--shadow-medium);
    margin-bottom: var(--spacing-lg);
    overflow: hidden;
  }

  .setup-btn {
    background: var(--primary);
    color: var(--button-text);
    border: none;
    padding: 12px 24px;
    border-radius: var(--card-border-radius);
    cursor: pointer;
    font-size: 16px;
    margin-top: var(--spacing-md);
    transition: var(--btn-transition);
  }

  .setup-btn:hover {
    background: var(--secondary);
    transform: scale(var(--hover-scale-subtle));
  }
</style>