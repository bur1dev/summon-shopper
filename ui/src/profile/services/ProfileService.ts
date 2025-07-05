import { encodeHash, decodeHash, callZome } from '../../cart/utils/zomeHelpers';
import { createSuccessResult, createErrorResult, validateClient } from '../../cart/utils/errorHelpers';
import type { AgentPubKey } from '@holochain/client';

let client: any = null;

export async function setProfileClient(holoClient: any) {
    client = holoClient;
    console.log("🔍 PROFILE SERVICE: Client set for profile lookups");
}

export interface CustomerProfile {
    agentPubKey: string;
    displayName: string | null;
    avatar: string | null;
    nickname: string | null;
}

/**
 * Look up a customer's profile by their agent public key
 */
export async function getCustomerProfile(customerPubKey: AgentPubKey | string): Promise<CustomerProfile | null> {
    const clientError = validateClient(client, 'fetching customer profile');
    if (clientError) {
        console.error("🔍 PROFILE SERVICE: Client validation failed:", clientError);
        return null;
    }

    try {
        console.log("🔍 PROFILE SERVICE: Looking up profile for customer:", customerPubKey);
        
        // Convert to proper format if needed
        let agentPubKey: AgentPubKey;
        if (typeof customerPubKey === 'string') {
            agentPubKey = decodeHash(customerPubKey);
        } else {
            agentPubKey = customerPubKey;
        }

        // Call the profiles zome to get the customer's profile
        const profileResult = await callZome(client, 'cart', 'profiles', 'get_agent_profile', agentPubKey);
        
        if (!profileResult) {
            console.log("🔍 PROFILE SERVICE: No profile found for customer");
            return {
                agentPubKey: encodeHash(agentPubKey),
                displayName: null,
                avatar: null,
                nickname: null
            };
        }

        console.log("🔍 PROFILE SERVICE: Found profile:", profileResult);

        // Extract profile data from the result - handle Holochain entry wrapper
        let profile = profileResult.entry?.entry || profileResult.entry || profileResult.profile || profileResult;
        
        // Handle "Present" wrapper from Holochain
        if (profile.Present) {
            profile = profile.Present;
        }
        
        // Handle serialized entry data (MessagePack format)
        if (profile.entry && profile.entry instanceof Uint8Array) {
            try {
                // Use MessagePack decoder - Holochain uses MessagePack
                const msgpack = await import('@msgpack/msgpack');
                profile = msgpack.decode(profile.entry);
                console.log("🔍 PROFILE SERVICE: MessagePack decoded profile:", profile);
            } catch (error) {
                console.error("🔍 PROFILE SERVICE: Failed to decode MessagePack:", error);
                console.log("🔍 PROFILE SERVICE: Raw entry bytes:", Array.from(profile.entry.slice(0, 50)));
            }
        }
        
        console.log("🔍 PROFILE SERVICE: Final profile data:", profile);
        console.log("🔍 PROFILE SERVICE: Profile fields:", { 
            nickname: profile.nickname, 
            display_name: profile.display_name,
            avatar: profile.avatar,
            fields: profile.fields
        });
        
        return {
            agentPubKey: encodeHash(agentPubKey),
            displayName: profile.nickname || profile.display_name || profile.fields?.nickname || profile.fields?.display_name || null,
            avatar: profile.avatar || profile.fields?.avatar || null,
            nickname: profile.nickname || profile.fields?.nickname || null
        };

    } catch (error) {
        console.error("🔍 PROFILE SERVICE: Error fetching customer profile:", error);
        return {
            agentPubKey: typeof customerPubKey === 'string' ? customerPubKey : encodeHash(customerPubKey),
            displayName: null,
            avatar: null,
            nickname: null
        };
    }
}

/**
 * Get multiple customer profiles efficiently
 */
export async function getCustomerProfiles(customerPubKeys: AgentPubKey[]): Promise<Map<string, CustomerProfile>> {
    const profiles = new Map<string, CustomerProfile>();
    
    // Process profiles in parallel for better performance
    const profilePromises = customerPubKeys.map(async (pubKey) => {
        const profile = await getCustomerProfile(pubKey);
        const keyString = encodeHash(pubKey);
        return { keyString, profile };
    });

    const results = await Promise.allSettled(profilePromises);
    
    results.forEach((result) => {
        if (result.status === 'fulfilled' && result.value.profile) {
            profiles.set(result.value.keyString, result.value.profile);
        }
    });

    console.log(`🔍 PROFILE SERVICE: Loaded ${profiles.size} customer profiles`);
    return profiles;
}

/**
 * Generate a short, human-readable identifier from agent public key
 */
export function getShortAgentId(agentPubKey: string): string {
    if (!agentPubKey) return "Unknown";
    
    // Take first 6 characters for a short ID
    return agentPubKey.slice(0, 8) + "...";
}

/**
 * Get display name for customer, with fallback to short agent ID
 */
export function getCustomerDisplayName(profile: CustomerProfile | null): string {
    if (!profile) return "Unknown Customer";
    
    if (profile.displayName) {
        return profile.displayName;
    }
    
    if (profile.nickname) {
        return profile.nickname;
    }
    
    // Fallback to short agent ID
    return getShortAgentId(profile.agentPubKey);
}