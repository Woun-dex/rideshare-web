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
    status: string; // e.g., 'REQUESTED', 'ACCEPTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'
    pickupLat: number;
    pickupLng: number;
    dropoffLat: number;
    dropoffLng: number;
    fare?: number;
    createdAt: string;
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
        const response = await apiClient.post('/api/trips/request', data);
        return response.data;
    },

    /** Driver accepts */
    acceptTrip: async (id: string): Promise<TripResponseDto> => {
        const response = await apiClient.post(`/api/trips/${id}/accept`);
        return response.data;
    },

    /** Transition status (e.g., driver arrived, started, completed) */
    updateStatus: async (id: string, data: TripStatusUpdateDto): Promise<TripResponseDto> => {
        const response = await apiClient.put(`/api/trips/${id}/status`, data);
        return response.data;
    },

    /** Get trip details */
    getTrip: async (id: string): Promise<TripResponseDto> => {
        const response = await apiClient.get(`/api/trips/${id}`);
        return response.data;
    },

    /** Rider/driver history */
    getHistory: async (): Promise<TripResponseDto[]> => {
        const response = await apiClient.get('/api/trips/history');
        return response.data;
    },

    /** Submit rating */
    rateTrip: async (id: string, data: TripRatingDto): Promise<void> => {
        const response = await apiClient.post(`/api/trips/${id}/rate`, data);
        return response.data;
    },

    /** Cancel trip */
    cancelTrip: async (id: string): Promise<void> => {
        const response = await apiClient.post(`/api/trips/${id}/cancel`);
        return response.data;
    },
};
