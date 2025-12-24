import { decode } from '@msgpack/msgpack';

/**
 * Generic decoder for Holochain Records
 * DRY principle: Single implementation for all record decoding
 */
function decodeRecord(record: any, recordType: string): any | null {
    try {
        if (!record?.entry?.Present?.entry) return null;
        const entryBytes = new Uint8Array(record.entry.Present.entry);
        return decode(entryBytes) as any;
    } catch (error) {
        console.error(`Error decoding ${recordType}:`, error);
        return null;
    }
}

/**
 * Decode delivery address from a Holochain Record
 */
export function decodeAddress(addressRecord: any): any | null {
    return decodeRecord(addressRecord, 'address');
}

/**
 * Decode delivery time slot from a Holochain Record
 */
export function decodeDeliveryTimeSlot(timeSlotRecord: any): any | null {
    return decodeRecord(timeSlotRecord, 'delivery time slot');
}

/**
 * Decode delivery instructions from a Holochain Record
 */
export function decodeDeliveryInstructions(instructionsRecord: any): any | null {
    return decodeRecord(instructionsRecord, 'delivery instructions');
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
