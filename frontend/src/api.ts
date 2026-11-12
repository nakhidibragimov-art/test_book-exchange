import axios from 'axios';
import { useAuth } from './store';

export const API = import.meta.env.VITE_API_URL || 'http://localhost:3000';
export const api = axios.create({ baseURL: API });

api.interceptors.request.use((cfg) => {
  const token = useAuth.getState().token;
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});
api.interceptors.response.use(
  (r) => r,
  (e) => {
    if (e.response?.status === 401 && useAuth.getState().token) useAuth.getState().logout();
    return Promise.reject(e);
  },
);

export interface Book { id: number; name: string; author: string; photo: string | null; ownerId: number; owner?: { id: number; name: string } }
export interface Paged<T> { items: T[]; total: number; page: number; pages: number }

export const photoSrc = (p: string | null) => (!p ? null : p.startsWith('http') ? p : `${API}${p}`);

export const errMsg = (e: any): string => {
  const m = e?.response?.data?.message;
  return Array.isArray(m) ? m.join(', ') : m || 'Щось пішло не так. Спробуйте ще раз.';
};
