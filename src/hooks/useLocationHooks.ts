import { useQuery, useMutation } from '@tanstack/react-query';
import type { LocationUpdateDto } from '../api/locationApi';
import { locationApi } from "../api/locationApi"

// Query Keys
export const locationKeys = {
    all: ['locations'] as const,
    nearby: (lat: number | undefined, lng: number | undefined, radius?: number) =>
        [...locationKeys.all, 'nearby', { lat, lng, radius }] as const,
    driver: (id: string) => [...locationKeys.all, 'driver', id] as const,
};

export const useUpdateLocation = () => {
    return useMutation({
        mutationFn: (data: LocationUpdateDto) => locationApi.updateLocation(data),
    });
};

export const useNearbyDrivers = (
    lat: number | undefined,
    lng: number | undefined,
    radius?: number,
    enabled = true
) => {
    return useQuery({
        queryKey: locationKeys.nearby(lat, lng, radius),
        queryFn: () => locationApi.getNearbyDrivers(lat!, lng!, radius),
        enabled: enabled && lat !== undefined && lng !== undefined,
        // Refetch nearby drivers every 5 seconds (useful for moving vehicles)
        refetchInterval: 5000,
    });
};

export const useDriverLocation = (id: string, enabled = true) => {
    return useQuery({
        queryKey: locationKeys.driver(id),
        queryFn: () => locationApi.getDriverLocation(id),
        enabled: !!id && enabled,
        // Refetch driver location every 3 seconds while they are tracking
        refetchInterval: 3000,
    });
};
