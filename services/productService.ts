import api from './api';
import { Product } from '../types';

export const productApi = {
    getAll: async (): Promise<Product[]> => {
        const response = await api.get('/products');
        return response.data;
    },
    create: async (data: Partial<Product>): Promise<Product> => {
        const response = await api.post('/products', data);
        return response.data;
    },
    update: async (id: string, data: Partial<Product>): Promise<Product> => {
        const response = await api.put(`/products/${id}`, data);
        return response.data;
    },
    delete: async (id: string): Promise<void> => {
        await api.delete(`/products/${id}`);
    }
};
