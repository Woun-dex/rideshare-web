import { apiClient } from './client';

export interface LocationUpdateDto {
    lat: number;
    lng: number;
    heading?: number;
    speed?: number;
}

export interface DriverLocationDto {
    driverId: string;
    lat: number;
    lng: number;
    heading?: number;
    lastUpdated?: string;
}

export const locationApi = {
    /** Report driver position */
    updateLocation: async (data: LocationUpdateDto): Promise<void> => {
        const response = await apiClient.post('/api/location/update', data);
        return response.data;
    },

    /** Query nearby drivers */
    getNearbyDrivers: async (lat: number, lng: number, radius?: number): Promise<DriverLocationDto[]> => {
        const response = await apiClient.get('/api/location/nearby', {
            params: { lat, lng, radius },
        });
        return response.data;
    },

    /** Get single driver position */
    getDriverLocation: async (id: string): Promise<DriverLocationDto> => {
        const response = await apiClient.get(`/api/location/driver/${id}`);
        return response.data;
    },
};
