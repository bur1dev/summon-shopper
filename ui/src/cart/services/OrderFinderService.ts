let client: any = null;

export function setOrderFinderClient(holochainClient: any): void {
    client = holochainClient;
}

// Post a customer's cart network seed to the shared order finder DNA
export async function postOrderRequest(
    customerName: string,
    cartNetworkSeed: string,
    estimatedTotal: string,
    deliveryTime: string
): Promise<string> {
    if (!client) throw new Error("Client not initialized");
    
    try {
        const orderRequest = {
            customer_pubkey: client.myPubKey,
            customer_name: customerName,
            cart_network_seed: cartNetworkSeed,
            estimated_total: estimatedTotal,
            delivery_time: deliveryTime,
            timestamp: Date.now() * 1000, // microseconds
            status: "posted"
        };
        
        const result = await client.callZome({
            role_name: 'order_finder',
            zome_name: 'order_finder',
            fn_name: 'post_order_request',
            payload: { request: orderRequest }
        });
        
        console.log(`🔍 CUSTOMER: Posted order request:`, result);
        return result; // Just return the hash directly
        
    } catch (error) {
        console.error(`🔍 CUSTOMER: Error posting order request:`, error);
        throw error;
    }
}

// Get all available order requests from shared order finder DNA (for shoppers)
export async function getAvailableOrders(): Promise<any[]> {
    if (!client) throw new Error("Client not initialized");
    
    try {
        const orders = await client.callZome({
            role_name: 'order_finder',
            zome_name: 'order_finder',
            fn_name: 'get_available_orders',
            payload: null
        });
        
        console.log(`🔍 SHOPPER: Retrieved ${orders.length} orders from shared network`);
        return orders;
        
    } catch (error) {
        console.error(`🔍 SHOPPER: Error getting available orders:`, error);
        throw error;
    }
}