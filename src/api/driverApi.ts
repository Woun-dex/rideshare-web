import { apiClient } from './client';

export interface DriverStatusUpdateDto {
    status: 'ONLINE' | 'OFFLINE';
}

export const driverApi = {
    updateStatus: async (data: DriverStatusUpdateDto): Promise<{ status: string }> => {
        const response = await apiClient.put('/api/drivers/status', data);
        return response.data;
    },
};
