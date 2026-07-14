import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

// Fix ReferenceError: error is not defined in report page templates
if (typeof window !== 'undefined') {
  window.error = null;
}

export const useApi = () => {
  const { token, logout } = useAuth();
  const navigate = useNavigate();
  const baseUrl = import.meta.env.VITE_API_URL;

  const request = async (url, options = {}) => {
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const config = {
      ...options,
      headers,
    };

    try {
      const res = await fetch(`${baseUrl}${url}`, config);
      if (res.status === 401) {
        logout();
        navigate('/login');
        throw new Error('Sesi Anda telah habis. Silakan login kembali.');
      }
      return res;
    } catch (e) {
      console.error('API request error:', e);
      throw e;
    }
  };

  return { request };
};
