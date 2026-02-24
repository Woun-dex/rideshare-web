import { apiClient } from './client';

// Optional: You can refine these interfaces based on your actual backend DTOs
export interface TripRequestDto {
    pickupLat: number;
    pickupLng: number;
    dropoffLat: number;
    dropoffLng: number;
    // e.g., vehicleType?: string;
}

export interface TripResponseDto {
    id: string;
    riderId: string;
    driverId?: string;
    status: string; // e.g., 'REQUESTED', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'
    pickupLat: number;
    pickupLng: number;
    dropoffLat: number;
    dropoffLng: number;
    fare?: number;
    rating?: number;
    createdAt: string;
}

/**
 * Maps the backend TripResponse shape to our frontend TripResponseDto.
 * Backend returns: { tripId, riderId, driverId, pickup: { latitude, longitude }, dropoff: { latitude, longitude }, status, rating }
 * Frontend expects: { id, pickupLat, pickupLng, dropoffLat, dropoffLng, ... }
 */
function mapTripResponse(raw: any): TripResponseDto {
    return {
        id: raw.tripId || raw.id || '',
        riderId: raw.riderId || '',
        driverId: raw.driverId || undefined,
        status: raw.status || 'UNKNOWN',
        pickupLat: raw.pickup?.latitude ?? raw.pickupLat ?? 0,
        pickupLng: raw.pickup?.longitude ?? raw.pickupLng ?? 0,
        dropoffLat: raw.dropoff?.latitude ?? raw.dropoffLat ?? 0,
        dropoffLng: raw.dropoff?.longitude ?? raw.dropoffLng ?? 0,
        fare: raw.fare,
        rating: raw.rating,
        createdAt: raw.createdAt || '',
    };
}

export interface TripStatusUpdateDto {
    status: string;
}

export interface TripRatingDto {
    rating: number; // 1-5
    comment?: string;
}

export const tripApi = {
    /** Request a new trip */
    requestTrip: async (data: TripRequestDto): Promise<TripResponseDto> => {
        const payload = {
            riderId: localStorage.getItem('userId'),
            pickupLocation: {
                latitude: data.pickupLat,
                longitude: data.pickupLng
            },
            dropoffLocation: {
                latitude: data.dropoffLat,
                longitude: data.dropoffLng
            }
        };
        const response = await apiClient.post('/api/trips/request', payload);
        console.log('[tripApi] requestTrip response:', JSON.stringify(response.data));
        // The backend may return tripId or id — handle both
        const tripId = response.data.tripId || response.data.id;
        if (!tripId) {
            console.error('[tripApi] No tripId found in response!', response.data);
        }
        return mapTripResponse({ ...response.data, tripId: tripId });
    },

    /** Driver accepts */
    acceptTrip: async (id: string): Promise<void> => {
        const driverId = localStorage.getItem('userId');
        await apiClient.post(`/api/trips/${id}/accept`, null, { params: { driverId } });
    },

    /** Transition status (e.g., driver arrived, started, completed) */
    updateStatus: async (id: string, data: TripStatusUpdateDto): Promise<void> => {
        await apiClient.put(`/api/trips/${id}/status`, data);
    },

    /** Get trip details */
    getTrip: async (id: string): Promise<TripResponseDto> => {
        const response = await apiClient.get(`/api/trips/${id}`);
        return mapTripResponse(response.data);
    },

    /** Rider/driver history */
    getHistory: async (): Promise<TripResponseDto[]> => {
        const userId = localStorage.getItem('userId');
        const role = localStorage.getItem('userRole');
        const params = role === 'DRIVER' ? { driverId: userId } : { riderId: userId };
        const response = await apiClient.get('/api/trips/history', { params });
        return (response.data || []).map(mapTripResponse);
    },

    /** Submit rating */
    rateTrip: async (id: string, data: TripRatingDto): Promise<void> => {
        const response = await apiClient.post(`/api/trips/${id}/rate`, data);
        return response.data;
    },

    /** Cancel trip */
    cancelTrip: async (id: string): Promise<void> => {
        await apiClient.post(`/api/trips/${id}/cancel`);
    },
};
