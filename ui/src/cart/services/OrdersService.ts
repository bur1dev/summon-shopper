import { encodeHash } from '../utils/zomeHelpers';
import { createSuccessResult, createErrorResult, validateClient } from '../utils/errorHelpers';
import { setCartCloneClient, initializeCartClone, joinCustomerCartClone } from './CartCloneService';
import { setOrderFinderClient, getAvailableOrders } from './OrderFinderService';
import { decodeDeliveryTimeSlot, formatDeliveryTimeForDisplay } from '../utils/recordDecoders';

let client: any = null;

export async function setOrdersClient(holoClient: any) {
    client = holoClient;
    setCartCloneClient(holoClient);
    await initializeCartClone();
    setOrderFinderClient(holoClient);
}


/**
 * Load delivery time for an order from customer's cart
 * Returns formatted time or placeholder if unavailable
 */
async function loadDeliveryTimeForOrder(cartNetworkSeed: string, placeholderTime: string) {
    try {
        const detailsResult = await loadOrderDetails(cartNetworkSeed);
        if (detailsResult.success && detailsResult.data.delivery_time) {
            const decodedTimeSlot = decodeDeliveryTimeSlot(detailsResult.data.delivery_time);
            return formatDeliveryTimeForDisplay(decodedTimeSlot) || { display: placeholderTime };
        }
    } catch (error) {
        console.warn(`Could not load delivery time for ${cartNetworkSeed}:`, error);
    }
    return { display: placeholderTime };
}

/**
 * Convert order request to UI-friendly order format
 */
function formatOrderForUI(orderReq: any, deliveryTime: any) {
    const { request } = orderReq;

    return {
        id: request.cart_network_seed,
        cartHash: encodeHash(orderReq.action_hash),
        products: [],
        total: 0,
        createdAt: new Date(request.timestamp / 1000).toLocaleString(),
        status: request.status,
        deliveryAddress: null,
        deliveryTime: deliveryTime,
        deliveryInstructions: null,
        customerPubKey: encodeHash(request.customer_pubkey),
        cartNetworkSeed: request.cart_network_seed,
        estimatedTotal: request.estimated_total
    };
}

// Load orders from shared order finder DNA
export async function loadOrders() {
    const clientError = validateClient(client, 'loading orders from order finder');
    if (clientError) return clientError;

    try {
        const allOrderRequests = await getAvailableOrders();
        console.log(`📋 Found ${allOrderRequests.length} available orders`);

        const processedOrders = await Promise.all(
            allOrderRequests.map(async (orderReq) => {
                const deliveryTime = await loadDeliveryTimeForOrder(
                    orderReq.request.cart_network_seed,
                    orderReq.request.delivery_time
                );
                return formatOrderForUI(orderReq, deliveryTime);
            })
        );

        return createSuccessResult(processedOrders);
    } catch (error) {
        console.error('Error loading orders:', error);
        return createErrorResult(error);
    }
}

// Load order details by joining customer's cart clone
export async function loadOrderDetails(cartNetworkSeed: string) {
    console.log(`🚀 SHOPPER DEBUG: Loading order details for cart: ${cartNetworkSeed}`);
    
    const clientError = validateClient(client, 'loading order details');
    if (clientError) return clientError;
    
    try {
        // Join the customer's cart clone
        const customerCartCellId = await joinCustomerCartClone(cartNetworkSeed);

        // Call get_current_items - EXACT same pattern as customer app
        const products = await client.callZome({
            cell_id: customerCartCellId,
            zome_name: 'cart',
            fn_name: 'get_current_items',
            payload: null
        });

        // Call get_session_data for address/delivery info
        const sessionData = await client.callZome({
            cell_id: customerCartCellId,
            zome_name: 'cart',
            fn_name: 'get_session_data',
            payload: null
        });

        console.log(`🚀 SHOPPER: Loaded ${products?.length || 0} products from customer cart`);
        console.log(`🚀 SHOPPER: Products data:`, products);
        console.log(`🚀 SHOPPER: Session data:`, sessionData);

        return createSuccessResult({
            products: products || [],
            address: sessionData.address,
            delivery_time: sessionData.delivery_time_slot,
            delivery_instructions: sessionData.delivery_instructions,
            session_status: sessionData.session_status,
            // Include cellId for signal sending
            cellId: customerCartCellId
        });

    } catch (error) {
        console.error(`🚀 SHOPPER DEBUG: Error loading order details:`, error);
        return createErrorResult(error);
    }
}

