import { useMutation, useQueryClient } from '@tanstack/react-query';
import type {  DriverStatusUpdateDto } from '../api/driverApi';
import { driverApi } from '../api/driverApi';

export const useUpdateDriverStatus = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: DriverStatusUpdateDto) => driverApi.updateStatus(data),
        onSuccess: () => {
            // Invalidate or update driver status in cache if we had a query for it
            queryClient.invalidateQueries({ queryKey: ['driverStatus'] });
        },
    });
};
