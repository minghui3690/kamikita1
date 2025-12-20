import api from './api';
import { Transaction, CartItem } from '../types';

export const transactionApi = {
    purchase: async (userId: string, items: CartItem[], paymentMethod: string, voucherCode?: string, pointsRedeemed: number = 0, paymentProof?: string): Promise<Transaction> => {
        const payload = {
            userId,
            items,
            paymentMethod,
            voucherCode,
            pointsRedeemed,
            paymentProof
        };
        const response = await api.post('/transactions', payload);
        return response.data;
    },
    purchaseGuest: async (guest: {name: string, email: string, phone: string, referralCode?: string}, items: CartItem[], paymentMethod: string, voucherCode?: string): Promise<Transaction> => {
        const payload = {
            guest,
            items,
            paymentMethod,
            voucherCode,
            pointsRedeemed: 0
        };
        const response = await api.post('/transactions/guest', payload);
        return response.data;
    },
    getMyTransactions: async (userId: string, scope?: 'personal' | 'group'): Promise<Transaction[]> => {
        const response = await api.get(`/transactions?userId=${userId}${scope ? `&scope=${scope}` : ''}`);
        return response.data;
    },
    // Admin: Get all transactions
    getAllTransactions: async (): Promise<Transaction[]> => {
        const response = await api.get('/transactions'); // Adjust backend to allow unlimited if admin
        return response.data;
    },
    // Dashboard Stats
    getStats: async (): Promise<any> => {
        const response = await api.get('/users/stats');
        return response.data;
    },
    toggleArchive: async (ids: string[], archive: boolean, target: 'TRANSACTION' | 'COMMISSION' = 'TRANSACTION') => {
        await api.put('/transactions/archive', { ids, archive, target });
    }
};
