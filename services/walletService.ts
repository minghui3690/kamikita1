import api from './api';

export const walletApi = {
    getCommissions: async () => {
        const response = await api.get('/users/wallet/history');
        return response.data;
    },
    getWithdrawals: async () => {
        const response = await api.get('/users/withdrawals');
        return response.data;
    },
    requestWithdrawal: async (amount: number, bankDetails?: string) => {
        const response = await api.post('/users/withdraw', { amount, bankDetails });
        return response.data;
    },
    cancelWithdrawal: async (id: string) => {
        const response = await api.post(`/users/withdraw/${id}/cancel`);
        return response.data;
    },
    updateWithdrawalStatus: async (id: string, status: 'APPROVED'|'REJECTED', proofImage?: string, proofLink?: string, rejectionReason?: string) => {
        const response = await api.put(`/users/withdraw/${id}`, { status, proofImage, proofLink, rejectionReason });
        return response.data;
    }
};
