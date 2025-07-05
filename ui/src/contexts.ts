import type { AppClient, HolochainError } from "@holochain/client";
import { AppWebsocket } from "@holochain/client";
import { getContext } from "svelte";
import { get, writable } from "svelte/store";

export const CLIENT_CONTEXT_KEY = Symbol("holochain-client");

interface ClientStore {
  client: AppClient | undefined;
  error: HolochainError | undefined;
  loading: boolean;
}

export function createClientStore() {
  const store = writable<ClientStore>({
    client: undefined,
    error: undefined,
    loading: false,
  });

  const { subscribe, set, update } = store;

  return {
    subscribe,
    connect: async () => {
      console.log("🚀 SHOPPER DEBUG: Starting client connection...");
      update(s => ({ ...s, loading: true }));
      try {
        console.log("🚀 SHOPPER DEBUG: Calling AppWebsocket.connect()...");
        const client = await AppWebsocket.connect();
        console.log("🚀 SHOPPER DEBUG: Client connected successfully:", client);
        const appInfo = await client.appInfo();
        console.log("🚀 SHOPPER DEBUG: Available app info:", appInfo);
        
        // 🔥 LOG DNA HASH FOR NETWORK VERIFICATION 🔥
        if (appInfo?.installed_app_id) {
          const roles = appInfo.cell_info;
          console.log("🔥 SHOPPER DNA HASH VERIFICATION 🔥");
          console.log("📡 App ID:", appInfo.installed_app_id);
          console.log("📡 Cells:", roles);
          
          // Extract DNA hash from cart role
          Object.entries(roles).forEach(([roleName, cellInfo]) => {
            console.log(`📡 Role: ${roleName}`, cellInfo);
            if (Array.isArray(cellInfo) && cellInfo.length > 0) {
              const cell = cellInfo[0];
              console.log(`📡 Cell structure:`, cell);
              if (cell.type === 'provisioned' && cell.value?.cell_id) {
                const dnaHash = cell.value.cell_id[0];
                const agentHash = cell.value.cell_id[1];
                console.log(`🔥 DNA HASH (${roleName}): ${dnaHash}`);
                console.log(`🔥 AGENT HASH (${roleName}): ${agentHash}`);
              } else {
                console.log(`📡 Cell is not provisioned or missing cell_id:`, Object.keys(cell));
              }
            } else {
              console.log(`📡 No cells in role ${roleName}:`, cellInfo);
            }
          });
        }
        update(s => ({ ...s, client }));
      } catch (e) {
        console.error("🚀 SHOPPER DEBUG: Client connection failed:", e);
        update(s => ({ ...s, error: e as HolochainError }));
      } finally {
        update(s => ({ ...s, loading: false }));
      }
    },
    getClient: () => {
      const { client } = get(store);
      if (!client) throw new Error("Client not initialized");
      return client;
    },
  };
}

export function getClient() {
  return getContext<ReturnType<typeof createClientStore>>(CLIENT_CONTEXT_KEY);
}
