export interface LocationPoint {
    latitude: number;
    longitude: number;
    address?: string;
}

export type EventType =
    | 'TRIP_REQUESTED'
    | 'TRIP_MATCHED'
    | 'TRIP_ACCEPTED'
    | 'STATUS_CHANGED'
    | 'LOCATION_UPDATED'
    | 'PAYMENT_PROCESSED'
    | 'RATING_CREATED';

export interface EventEnvelope {
    eventId: string;
    eventType: EventType;
    tripId: string;
    riderId?: string | null;
    driverId?: string | null;
    pickup?: LocationPoint;
    dropoff?: LocationPoint;
    fare?: number;
    status?: string;
    timestamp: string;

    // Used primarily in LOCATION_UPDATED events
    latitude?: number;
    longitude?: number;
}
