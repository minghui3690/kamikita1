import api from './api';

// --- ADMIN ---

export const getAllKnowledge = async () => {
    const response = await api.get('/hd-knowledge');
    return response.data;
};

export const saveKnowledge = async (data: any) => {
    const response = await api.post('/hd-knowledge', data);
    return response.data;
};

export const deleteKnowledge = async (key: string) => {
    const encodedKey = encodeURIComponent(key);
    const response = await api.delete(`/hd-knowledge/${encodedKey}`);
    return response.data;
};

// --- MEMBER ---

export const getMyKnowledge = async (keys: string[]) => {
    const response = await api.post(`/hd-knowledge/my-knowledge`, { keys });
    return response.data;
};
