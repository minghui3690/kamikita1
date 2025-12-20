import axios from 'axios';
import { Product, Voucher } from '../types';

const API_URL = 'http://localhost:5001/api';

export const publicApi = {
    getProducts: async (): Promise<Product[]> => {
        const response = await axios.get(`${API_URL}/products`);
        return response.data;
    },
    
    // We can fetch all vouchers to check validity locally or make a backend endpoint.
    // For now, since GET /vouchers is open, we can fetch all.
    // Ideally we'd have POST /vouchers/validate but let's stick to existing routes to minimize backend churn if possible.
    getVouchers: async (): Promise<Voucher[]> => {
        const response = await axios.get(`${API_URL}/vouchers`);
        return response.data;
    }
};
