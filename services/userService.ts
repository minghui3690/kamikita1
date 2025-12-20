import api from './api';

// Direct exports for MemberManagement
export const getUsers = async (): Promise<any[]> => {
    const response = await api.get('/users');
    return response.data;
};

export const toggleUserStatus = async (id: string): Promise<any> => {
    const response = await api.put(`/users/${id}/status`);
    return response.data;
};

export const deleteUser = async (id: string): Promise<any> => {
    const response = await api.delete(`/users/${id}`);
    return response.data;
};

export const updateProfile = async (data: any): Promise<any> => {
    const response = await api.put('/users/profile', data);
    return response.data;
};

// Admin update user
export const updateUserAdmin = async (id: string, data: any): Promise<any> => {
    const response = await api.put(`/users/${id}`, data);
    return response.data;
};

// Human Design
export const getHumanDesign = async (id: string): Promise<any> => {
    try {
        const response = await api.get(`/users/${id}/human-design`);
        return response.data;
    } catch (e) {
        return null;
    }
};

export const toggleKakaAccess = async (id: string): Promise<any> => {
    const response = await api.put(`/users/${id}/kaka-access`);
    return response.data;
};

export const toggleHumanDesignAccess = async (id: string): Promise<any> => {
    const response = await api.put(`/users/${id}/human-design-access`);
    return response.data;
};

export const toggleAiAssistantAccess = async (id: string): Promise<any> => {
    const response = await api.put(`/users/${id}/ai-assistant-access`);
    return response.data;
};

export const updateHDAccessLevels = async (id: string, levels: { level1: boolean, level2: boolean, level3: boolean, level4: boolean }): Promise<any> => {
    const response = await api.put(`/users/${id}/hd-access-levels`, levels);
    return response.data;
};

export const getKakaItems = async (): Promise<any[]> => {
    const response = await api.get('/users/kaka-items');
    return response.data;
};

export const saveHumanDesign = async (id: string, data: any): Promise<any> => {
    const response = await api.post(`/users/${id}/human-design`, data);
    return response.data;
};

// Admin File Access
export const getAdminUserTransactions = async (userId: string): Promise<any[]> => {
    const response = await api.get(`/users/${userId}/transactions`);
    return response.data;
};

export const grantManualAccess = async (userId: string, fileName: string, fileUrl: string): Promise<any> => {
    const response = await api.post(`/users/${userId}/grant-access`, { fileName, fileUrl });
    return response.data;
};

export const updateUserAccess = async (userId: string, productId: string | null, newUrl: string, newName: string, productName?: string): Promise<any> => {
    const response = await api.put(`/users/${userId}/update-access`, { productId, newUrl, newName, productName });
    return response.data;
};

export const sendProductFile = async (userId: string, productId: string, email?: string, subject?: string, message?: string): Promise<any> => {
    const response = await api.post(`/users/${userId}/send-file`, { productId, email, subject, message });
    return response.data;
};

// KAKA Management
export const createKakaItem = async (data: any): Promise<any> => {
    const response = await api.post('/users/kaka-items', data);
    return response.data;
};

export const updateKakaItem = async (id: string, data: any): Promise<any> => {
    const response = await api.put(`/users/kaka-items/${id}`, data);
    return response.data;
};

export const deleteKakaItem = async (id: string): Promise<any> => {
    const response = await api.delete(`/users/kaka-items/${id}`);
    return response.data;
};

export const transferPoints = async (id: string, amount: number, direction: 'IN' | 'OUT', reason?: string): Promise<any> => {
    const response = await api.post(`/users/${id}/transfer-points`, { amount, direction, reason });
    return response.data;
};

export const getAdminWalletLogs = async (showHidden: boolean = false): Promise<any[]> => {
    const response = await api.get(`/users/admin/wallet?hidden=${showHidden}`);
    return response.data;
};

export const archiveAdminLogs = async (items: { id: string, type: string }[], archive: boolean): Promise<any> => {
    const response = await api.post('/users/admin/wallet/archive', { items, archive });
    return response.data;
};

export const userApi = {
    getNetwork: async (viewUser?: string): Promise<any> => {
        const response = await api.get('/users/network' + (viewUser ? `?viewUser=${viewUser}` : ''));
        return response.data;
    },
    getRecentActions: async (showHidden: boolean = false): Promise<any[]> => {
        const response = await api.get(`/users/recent?hidden=${showHidden}`);
        return response.data;
    },
    archiveActions: async (items: any[], archive: boolean): Promise<any> => {
        const response = await api.post('/users/recent/archive', { items, archive });
        return response.data;
    }
};
