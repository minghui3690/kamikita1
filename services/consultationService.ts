import axios from 'axios';

// Dynamic API URL based on window location (for local network access)
const getApiUrl = () => {
   if (typeof window !== 'undefined') {
       const host = window.location.hostname;
       return `http://${host}:5001/api/consultation`;
   }
   return 'http://localhost:5001/api/consultation';
};

const API_URL = getApiUrl();

// Admin
export const createSlots = async (slots: { startTime: Date, endTime: Date }[]) => {
    const token = localStorage.getItem('rda_token');
    const response = await axios.post(`${API_URL}/admin/slots`, { slots }, {
        headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
};

export const getSchedule = async () => {
    const token = localStorage.getItem('rda_token');
    const response = await axios.get(`${API_URL}/admin/schedule`, {
        headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
};

export const getCredits = async () => {
    const token = localStorage.getItem('rda_token');
    const response = await axios.get(`${API_URL}/admin/credits`, {
        headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
};

export const updateSessionNotes = async (id: string, notes: { adminNotes?: string, clientNotes?: string, recordingUrl?: string }) => {
    const token = localStorage.getItem('rda_token');
    const response = await axios.put(`${API_URL}/admin/session/${id}/notes`, notes, {
        headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
};

export const adminReschedule = async (id: string, newSlotId: string) => {
    const token = localStorage.getItem('rda_token');
    const response = await axios.post(`${API_URL}/admin/session/${id}/reschedule`, { newSlotId }, {
        headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
};

export const updateSessionStatus = async (id: string, status: string) => {
    const token = localStorage.getItem('rda_token');
    const response = await axios.put(`${API_URL}/admin/session/${id}/status`, { status }, {
        headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
};

export const sendReminder = async (id: string) => {
    const token = localStorage.getItem('rda_token');
    const response = await axios.post(`${API_URL}/admin/session/${id}/reminder`, {}, {
        headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
};

// Guest / Public
export const validateToken = async (token: string) => {
    const response = await axios.get(`${API_URL}/validate-token?token=${token}`);
    return response.data;
};

export const getGuestSessions = async (token: string) => {
    const response = await axios.get(`${API_URL}/sessions?token=${token}`);
    return response.data;
};

export const bookSlot = async (token: string, slotId: string) => {
    const response = await axios.post(`${API_URL}/book`, { token, slotId });
    return response.data;
};

export const rescheduleSlot = async (token: string, sessionId: string, newSlotId: string) => {
    const response = await axios.post(`${API_URL}/reschedule`, { token, sessionId, newSlotId });
    return response.data;
};
