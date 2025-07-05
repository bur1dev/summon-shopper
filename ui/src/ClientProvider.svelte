<script lang="ts">
import { onMount, setContext } from "svelte";
import { CLIENT_CONTEXT_KEY, createClientStore } from "./contexts";

const clientStore = createClientStore();
setContext(CLIENT_CONTEXT_KEY, clientStore);

onMount(() => {
  clientStore.connect();
});

// Svelte 4 reactive variables
let client: any;
let error: any;
let loading: boolean;

$: ({ client, error, loading } = $clientStore);
</script>

{#if loading}
  <progress></progress>
{:else if error}
  <div class="alert">
    Error connecting to Holochain: {error.message}
  </div>
{:else if client}
  <slot />
{/if}
