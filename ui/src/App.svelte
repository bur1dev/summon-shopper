<script lang="ts">
import { onMount } from "svelte";
import { setContext } from "svelte";
import logo from "./assets/holochainLogo.svg";
import ClientProvider from "./ClientProvider.svelte";
import { CLIENT_CONTEXT_KEY, createClientStore } from "./contexts";
import OrdersView from "./cart/orders/components/OrdersView.svelte";
import OrderDetailView from "./cart/orders/components/OrderDetailView.svelte";

// Profile imports
import { ProfilesStore, ProfilesClient } from "@holochain-open-dev/profiles";
import "@holochain-open-dev/profiles/dist/elements/profiles-context.js";
import "@holochain-open-dev/profiles/dist/elements/create-profile.js";
import "@shoelace-style/shoelace/dist/themes/light.css";

const clientStore = createClientStore();
setContext(CLIENT_CONTEXT_KEY, clientStore);

// Svelte 4 reactive variables
let error: any;
let loading: boolean;
let client: any;

// Subscribe to store changes (Svelte 4 way)
$: ({ error, loading, client } = $clientStore);

// Navigation state
let currentView = "orders"; // "orders" | "detail"
let selectedOrder: any = null;

// Profile state
let profilesStore: ProfilesStore | undefined;

function showOrderDetail(order: any) {
  selectedOrder = order;
  currentView = "detail";
}

function showOrdersList() {
  currentView = "orders";
  selectedOrder = null;
}

function handleProfileCreated(event: CustomEvent) {
  console.log("Profile created event:", event);
  console.log("Event detail:", event.detail);
}

// Reactive statements for profile state (Svelte 4 way)
$: if (client && !profilesStore) {
  console.log("Initializing ProfilesStore...");
  profilesStore = new ProfilesStore(new ProfilesClient(client, "profiles_role"), {
    avatarMode: "avatar-optional",
    minNicknameLength: 2,
    additionalFields: [],
  });
}

$: prof = profilesStore ? profilesStore.myProfile : undefined;
$: profValue = $prof && ($prof as any).value;
$: connected = !loading && !error && client;

onMount(() => {
  clientStore.connect();
});
</script>

<ClientProvider>
  <div class="app-container">
    {#if connected && profilesStore}
      <profiles-context store={profilesStore}>
        {#if !$prof || ($prof && $prof.status === "pending")}
          <!-- Loading profile state -->
          <div class="loading-screen">
            <div class="loading-content">
              <div class="shopper-logo">SHOPPER</div>
              <div class="loading-spinner"></div>
              <p>Connecting to network...</p>
            </div>
          </div>
        {:else if $prof && $prof.status === "complete" && !profValue}
          <!-- Profile creation state -->
          <div class="welcome-screen">
            <div class="welcome-content">
              <div class="welcome-header">
                <div class="shopper-logo">SHOPPER</div>
                <h1>Welcome to Shopper</h1>
                <p>Create your shopper profile to get started</p>
              </div>
              <div class="profile-creation">
                <create-profile
                  on:profile-created={handleProfileCreated}
                ></create-profile>
              </div>
            </div>
          </div>
        {:else}
          <!-- Main app state -->
          <div class="orders-container">
            {#if currentView === "orders"}
              <OrdersView onOrderClick={showOrderDetail} />
            {:else if currentView === "detail" && selectedOrder}
              <OrderDetailView order={selectedOrder} onBack={showOrdersList} />
            {/if}
          </div>
        {/if}
      </profiles-context>
    {:else}
      <!-- Initial loading state -->
      <div class="loading-screen">
        <div class="loading-content">
          <div class="shopper-logo">SHOPPER</div>
          <div class="loading-spinner"></div>
          {#if loading}
            <p>Connecting to Holochain...</p>
          {:else if error}
            <div class="error">Connection Error: {error.message}</div>
          {:else}
            <p>Initializing...</p>
          {/if}
        </div>
      </div>
    {/if}
  </div>
</ClientProvider>

<style>
.app-container {
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
}

/* Loading Screen */
.loading-screen {
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, var(--primary), var(--secondary));
}

.loading-content {
  text-align: center;
  color: var(--button-text);
}

.shopper-logo {
  font-size: 4rem;
  font-weight: var(--font-weight-bold);
  margin-bottom: var(--spacing-xl);
  color: var(--button-text);
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid rgba(255, 255, 255, 0.3);
  border-top: 4px solid var(--button-text);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto var(--spacing-md);
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* Welcome Screen */
.welcome-screen {
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, var(--primary), var(--secondary));
  padding: var(--spacing-lg);
}

.welcome-content {
  background: var(--background);
  border-radius: var(--card-border-radius);
  padding: var(--spacing-xxxl);
  box-shadow: var(--shadow-medium);
  text-align: center;
  max-width: 500px;
  width: 100%;
}

.welcome-header {
  margin-bottom: var(--spacing-xxxl);
}

.welcome-header .shopper-logo {
  font-size: 3rem;
  color: var(--primary);
  margin-bottom: var(--spacing-lg);
  text-shadow: none;
}

.welcome-header h1 {
  margin: 0 0 var(--spacing-md) 0;
  font-size: 2rem;
  font-weight: var(--font-weight-bold);
  color: var(--text-primary);
}

.welcome-header p {
  margin: 0;
  color: var(--text-secondary);
  font-size: var(--font-size-md);
}

.profile-creation {
  width: 100%;
}

/* Profile creation component styling */
:global(create-profile) {
  /* Input styling */
  --sl-input-height-medium: var(--btn-height-md, 50px);
  --sl-input-color: var(--text-primary, #1A1A1A);
  --sl-input-placeholder-color: var(--text-secondary, #5A5A5A);
  --sl-input-background-color: var(--surface, #F8F8F8);
  --sl-input-border-color: var(--border, #E0E0E0);
  --sl-input-border-color-hover: var(--primary, #ff7300);
  --sl-input-border-color-focus: var(--primary, #ff7300);
  --sl-input-border-radius-medium: var(--btn-border-radius, 50px);
  --sl-focus-ring-color: var(--primary, #ff7300);

  /* Font styling */
  --sl-font-family: var(--font-family, "Plus Jakarta Sans", -apple-system, BlinkMacSystemFont, sans-serif);

  /* Button styling */
  --sl-button-font-size-medium: var(--font-size-md, 16px);
  --sl-button-height-medium: var(--btn-height-md, 50px);
  --sl-button-border-radius-medium: var(--btn-border-radius, 50px);
  --sl-button-font-weight-medium: var(--font-weight-semibold, 600);
  --sl-transition-medium: var(--btn-transition, all 0.25s ease);

  /* Primary button colors */
  --sl-color-primary-500: var(--primary, #ff7300) !important;
  --sl-color-primary-600: var(--primary-dark, #E03C00) !important;
  --sl-color-primary-950: var(--primary-dark, #E03C00) !important;
  --sl-color-primary-text: var(--button-text, #ffffff) !important;

  /* Neutral colors */
  --sl-color-neutral-0: var(--surface, #F8F8F8) !important;
  --sl-color-neutral-400: var(--border, #E0E0E0) !important;
  --sl-color-neutral-700: var(--text-primary, #1A1A1A) !important;
}

.error {
  text-align: center;
  padding: 2rem;
  color: var(--error);
  background: rgba(211, 47, 47, 0.1);
  margin: 1rem;
  border-radius: 8px;
}

.orders-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  margin: 0;
  padding: 0;
}
</style>
