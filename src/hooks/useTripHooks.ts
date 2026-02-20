import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { TripRequestDto, TripStatusUpdateDto, TripRatingDto } from '../api/tripApi';
import { tripApi } from "../api/tripApi"
// Query Keys
export const tripKeys = {
    all: ['trips'] as const,
    details: () => [...tripKeys.all, 'detail'] as const,
    detail: (id: string) => [...tripKeys.details(), id] as const,
    history: () => [...tripKeys.all, 'history'] as const,
};

export const useRequestTrip = () => {
    return useMutation({
        mutationFn: (data: TripRequestDto) => tripApi.requestTrip(data),
    });
};

export const useAcceptTrip = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => tripApi.acceptTrip(id),
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: tripKeys.detail(data.id) });
        },
    });
};

export const useUpdateTripStatus = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: TripStatusUpdateDto }) =>
            tripApi.updateStatus(id, data),
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: tripKeys.detail(data.id) });
        },
    });
};

export const useGetTrip = (
    id: string,
    enabled = true,
    refetchInterval: number | false = false
) => {
    return useQuery({
        queryKey: tripKeys.detail(id),
        queryFn: () => tripApi.getTrip(id),
        enabled: !!id && enabled,
        refetchInterval,
    });
};

export const useGetTripHistory = () => {
    return useQuery({
        queryKey: tripKeys.history(),
        queryFn: tripApi.getHistory,
    });
};

export const useRateTrip = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: TripRatingDto }) =>
            tripApi.rateTrip(id, data),
        onSuccess: (_, { id }) => {
            queryClient.invalidateQueries({ queryKey: tripKeys.detail(id) });
            queryClient.invalidateQueries({ queryKey: tripKeys.history() });
        },
    });
};

export const useCancelTrip = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => tripApi.cancelTrip(id),
        onSuccess: (_, id) => {
            queryClient.invalidateQueries({ queryKey: tripKeys.detail(id) });
            queryClient.invalidateQueries({ queryKey: tripKeys.history() });
        },
    });
};
