import api from './api';

export const testimonialApi = {
    // Member
    create: async (data: { productId: string, rating: number, content: string, image?: string }) => {
        const response = await api.post('/testimonials', data);
        return response.data;
    },
    
    // Public
    getProductReviews: async (productId: string) => {
        const response = await api.get(`/testimonials/product/${productId}`);
        return response.data;
    },

    // Admin
    getAllReviews: async () => {
        const response = await api.get('/testimonials/admin/all');
        return response.data;
    },
    
    updateStatus: async (id: string, isPublic: boolean) => {
        const response = await api.patch(`/testimonials/${id}/status`, { isPublic });
        return response.data;
    },
    
    delete: async (id: string) => {
        const response = await api.delete(`/testimonials/${id}`);
        return response.data;
    }
};
