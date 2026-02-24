import { apiClient } from './client';

export interface DriverStatusUpdateDto {
    status: 'ONLINE' | 'OFFLINE';
}

export const driverApi = {
    updateStatus: async (data: DriverStatusUpdateDto): Promise<{ status: string }> => {
        const payload = {
            driverId: localStorage.getItem('userId'),
            status: data.status
        };
        const response = await apiClient.put('/api/drivers/status', payload);
        return response.data;
    },
};
