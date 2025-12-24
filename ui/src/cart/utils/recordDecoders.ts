import { decode } from '@msgpack/msgpack';

/**
 * Decode delivery address from a Holochain Record
 */
export function decodeAddress(addressRecord: any): any | null {
    try {
        if (!addressRecord?.entry?.Present?.entry) return null;
        const entryBytes = new Uint8Array(addressRecord.entry.Present.entry);
        return decode(entryBytes) as any;
    } catch (error) {
        console.error('Error decoding address:', error);
        return null;
    }
}

/**
 * Decode delivery time slot from a Holochain Record
 */
export function decodeDeliveryTimeSlot(timeSlotRecord: any): any | null {
    try {
        if (!timeSlotRecord?.entry?.Present?.entry) return null;
        const entryBytes = new Uint8Array(timeSlotRecord.entry.Present.entry);
        return decode(entryBytes) as any;
    } catch (error) {
        console.error('Error decoding delivery time slot:', error);
        return null;
    }
}

/**
 * Decode delivery instructions from a Holochain Record
 */
export function decodeDeliveryInstructions(instructionsRecord: any): any | null {
    try {
        if (!instructionsRecord?.entry?.Present?.entry) return null;
        const entryBytes = new Uint8Array(instructionsRecord.entry.Present.entry);
        return decode(entryBytes) as any;
    } catch (error) {
        console.error('Error decoding delivery instructions:', error);
        return null;
    }
}

/**
 * Format decoded delivery time slot for display
 */
export function formatDeliveryTimeForDisplay(decodedTimeSlot: any): { date: string; time: string } | null {
    if (!decodedTimeSlot) return null;

    return {
        date: new Date(decodedTimeSlot.date).toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
            year: "numeric"
        }),
        time: decodedTimeSlot.time_slot
    };
}
