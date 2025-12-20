import api from './api';

export const getCustomers = async (showHidden: boolean = false) => {
    const response = await api.get(`/customers?hidden=${showHidden}`);
    return response.data;
};

export const archiveCustomers = async (ids: string[], archive: boolean) => {
    const response = await api.post('/customers/archive', { ids, archive });
    return response.data;
};
