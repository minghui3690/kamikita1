import api from './api';

export interface Voucher {
    id: string;
    code: string;
    discountPercent: number;
    startDate: string; // ISO string from API
    endDate: string;
    isActive: boolean;
}

export const voucherApi = {
    getAll: async (): Promise<Voucher[]> => {
        const response = await api.get('/vouchers');
        return response.data;
    },
    create: async (data: Partial<Voucher>): Promise<Voucher> => {
        const response = await api.post('/vouchers', data);
        return response.data;
    },
    delete: async (id: string): Promise<void> => {
        await api.delete(`/vouchers/${id}`);
    }
};
