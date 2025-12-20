import api from './api';
import { SystemSettings } from '../types';

export const settingsApi = {
    getSettings: async (): Promise<SystemSettings> => {
        const response = await api.get('/settings');
        return response.data;
    },
    updateSettings: async (settings: Partial<SystemSettings>) => {
        const response = await api.put('/settings', settings);
        return response.data;
    }
};
