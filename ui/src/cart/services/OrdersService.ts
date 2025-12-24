import { encodeHash, decodeHash, callZome } from '../utils/zomeHelpers';
import { createSuccessResult, createErrorResult, validateClient } from '../utils/errorHelpers';
import type { ActionHashB64 } from '../types/CartTypes';
import { setCartCloneClient, initializeCartClone, getCartCloneCellId, joinCustomerCartClone } from './CartCloneService';
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
        console.log(`🚀 SHOPPER: Session data:`, sessionData);

        return createSuccessResult({
            products: products || [],
            address: sessionData.address,
            delivery_time: sessionData.delivery_time_slot,
            delivery_instructions: sessionData.delivery_instructions,
            session_status: sessionData.session_status
        });

    } catch (error) {
        console.error(`🚀 SHOPPER DEBUG: Error loading order details:`, error);
        return createErrorResult(error);
    }
}

// Helper: Format delivery time
function formatDeliveryTime(delivery_time: any) {
    if (!delivery_time) return null;
    
    const deliveryDate = new Date(delivery_time.date);
    return {
        date: deliveryDate.toLocaleDateString('en-US', {
            weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
        }),
        time: delivery_time.time_slot,
        raw: delivery_time
    };
}

// SIMPLIFIED: Process orders - address data now included in public cart entries
async function processOrders(carts: any[]) {
    console.log("🚀 SHOPPER DEBUG: Processing checked out carts from Holochain:", carts);

    // Process each cart and resolve customer profiles
    const processedCarts = await Promise.all(carts.map(async (cart) => {
        const cartHash = encodeHash(cart.cart_hash);
        const { id, products, total, created_at, status, delivery_time, delivery_address, delivery_instructions, customer_pub_key } = cart.cart;

        console.log("🚀 SHOPPER DEBUG: Cart delivery_address:", delivery_address);
        console.log("🔍 PROFILE DEBUG: Customer pub key:", customer_pub_key);
        
        // Resolve customer profile
        let customerProfile: CustomerProfile | null = null;
        let customerName = "Unknown Customer";
        
        if (customer_pub_key) {
            console.log("🔍 PROFILE DEBUG: Looking up customer profile...");
            try {
                customerProfile = await getCustomerProfile(customer_pub_key);
                customerName = getCustomerDisplayName(customerProfile);
                console.log("🔍 PROFILE DEBUG: Resolved customer name:", customerName);
            } catch (error) {
                console.error("🔍 PROFILE DEBUG: Error resolving customer profile:", error);
                customerName = "Customer"; // Fallback
            }
        }

        // All product data is already in the cart.products array!
        const productsWithDetails = products.map((product: any) => {
            console.log("🔍 NOTES DEBUG: Processing product:", product.product_name);
            console.log("🔍 NOTES DEBUG: Raw product note value:", JSON.stringify(product.note));
            console.log("🔍 NOTES DEBUG: Note type:", typeof product.note);
            console.log("🔍 NOTES DEBUG: Note truthiness:", !!product.note);
            console.log(`[LOG] UPC Data: Product "${product.product_name}" has UPC: ${product.upc || 'MISSING'}`);
            
            return {
                productId: product.product_id,
                upc: product.upc || null,
                productName: product.product_name,
                productImageUrl: product.product_image_url,
                priceAtCheckout: product.price_at_checkout,
                promoPrice: product.promo_price,
                soldBy: product.sold_by || null, // Add soldBy field
                quantity: product.quantity,
                timestamp: product.timestamp || Date.now(),
                addedOrder: product.added_order || null, // Add addedOrder field
                note: product.note,
                // For backward compatibility with UI that might expect these fields:
                details: {
                    name: product.product_name,
                    image_url: product.product_image_url,
                    price: product.price_at_checkout,
                    promo_price: product.promo_price
                }
            };
        });

        // Calculate total from frozen prices (already in cart)
        const calculatedTotal = productsWithDetails.reduce((sum: number, p: any) => 
            sum + (p.priceAtCheckout * p.quantity), 0);

        return {
            id,
            cartHash,
            products: productsWithDetails,
            total: calculatedTotal > 0 ? calculatedTotal : total,
            createdAt: new Date(created_at / 1000).toLocaleString(),
            status,
            // Address is now available directly in cart entry
            deliveryAddress: delivery_address,
            deliveryTime: formatDeliveryTime(delivery_time),
            // Convert snake_case to camelCase for frontend consistency
            deliveryInstructions: delivery_instructions,
            // Customer information
            customerName,
            customerProfile,
            customerPubKey: customer_pub_key
        };
    }));

    return processedCarts;
}