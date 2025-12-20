import api from './api';
import { User } from '../types';

export const login = async (email: string, password: string): Promise<{ user: User; token: string }> => {
  const response = await api.post('/auth/login', { email, password });
  if (response.data.token) {
    localStorage.setItem('rda_token', response.data.token);
  }
  return response.data;
};

export const register = async (name: string, email: string, password: string, referralCode?: string): Promise<{ user: User; token: string }> => {
  const response = await api.post('/auth/register', { name, email, password, referralCode });
  if (response.data.token) {
    localStorage.setItem('rda_token', response.data.token);
  }
  return response.data;
};

export const getMe = async (): Promise<User> => {
  const response = await api.get('/auth/me');
  return response.data;
};
