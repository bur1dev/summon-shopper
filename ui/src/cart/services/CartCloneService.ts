import type { CellId } from '@holochain/client';
import { encodeHashToBase64 } from '@holochain/client';

let client: any = null;
let cloneCellId: CellId | null = null;
let customerCartClones: Map<string, CellId> = new Map(); // Track customer cart clones by network seed

export function setCartCloneClient(holochainClient: any): void {
    client = holochainClient;
}

// Initialize shopper's personal cart clone (for testing purposes)
export async function initializeCartClone(): Promise<void> {
    if (!client) throw new Error("Client not initialized");
    if (cloneCellId) return;

    const agentPubKeyB64 = encodeHashToBase64(client.myPubKey);
    const appInfo = await client.appInfo();
    const clones = appInfo.cell_info["cart"] || [];
    
    const existingClone = clones.find((cell: any) => cell.type === "cloned");

    if (existingClone) {
        cloneCellId = existingClone.value.cell_id;
        console.log(`🛒 SHOPPER: Using existing cart clone: ${encodeHashToBase64(cloneCellId![0])}`);
    } else {
        const clone = await client.createCloneCell({
            modifiers: { network_seed: agentPubKeyB64 },
            name: `shopper-cart-${agentPubKeyB64.slice(0, 8)}`,
            role_name: "cart"
        });
        cloneCellId = clone.cell_id;
        console.log(`🛒 SHOPPER: Created new cart clone: ${encodeHashToBase64(cloneCellId![0])}`);
    }
}

// Join a customer's cart clone using their network seed (for shopping)
export async function joinCustomerCartClone(customerNetworkSeed: string): Promise<CellId> {
    if (!client) throw new Error("Client not initialized");
    
    // Check if we already have this customer's cart clone
    if (customerCartClones.has(customerNetworkSeed)) {
        const existingCellId = customerCartClones.get(customerNetworkSeed)!;
        console.log(`🛒 SHOPPER: Using existing customer cart clone: ${customerNetworkSeed}`);
        return existingCellId;
    }
    
    try {
        const appInfo = await client.appInfo();
        const clones = appInfo.cell_info["cart"] || [];
        
        // Look for existing clone with this network seed
        const existingClone = clones.find((cell: any) => {
            if (cell.type === "cloned" && cell.value?.clone_id) {
                // Check if clone_id contains the network seed
                return cell.value.clone_id.includes(customerNetworkSeed.slice(0, 8));
            }
            return false;
        });
        
        let customerCellId: CellId;
        
        if (existingClone) {
            customerCellId = existingClone.value.cell_id;
            console.log(`🛒 SHOPPER: Found existing customer cart clone: ${customerNetworkSeed}`);
        } else {
            // Create new clone to join customer's cart network
            const clone = await client.createCloneCell({
                modifiers: { network_seed: customerNetworkSeed },
                name: `customer-cart-${customerNetworkSeed.slice(0, 8)}`,
                role_name: "cart"
            });
            customerCellId = clone.cell_id;
            console.log(`🛒 SHOPPER: Joined customer cart clone: ${customerNetworkSeed}`);
        }
        
        // Cache the customer cart clone
        customerCartClones.set(customerNetworkSeed, customerCellId);
        return customerCellId;
        
    } catch (error) {
        console.error(`🛒 SHOPPER: Error joining customer cart clone ${customerNetworkSeed}:`, error);
        throw error;
    }
}

// Get shopper's personal cart clone cell ID
export function getCartCloneCellId(): CellId | null {
    return cloneCellId;
}

// Get customer cart clone cell ID by network seed
export function getCustomerCartCloneCellId(customerNetworkSeed: string): CellId | null {
    return customerCartClones.get(customerNetworkSeed) || null;
}

export function isCartCloneReady(): boolean {
    return cloneCellId !== null;
}

export function isCustomerCartCloneReady(customerNetworkSeed: string): boolean {
    return customerCartClones.has(customerNetworkSeed);
}

// Clear customer cart clones (for cleanup)
export function clearCustomerCartClones(): void {
    customerCartClones.clear();
}