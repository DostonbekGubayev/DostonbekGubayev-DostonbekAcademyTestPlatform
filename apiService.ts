
import { QuizResult, User, CenterTest } from './types';

const API_BASE_URL = '/api';

const safeFetch = async (url: string, options: any = {}) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 sekund

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    });
    clearTimeout(timeoutId);
    return response;
  } catch (e) {
    clearTimeout(timeoutId);
    return null;
  }
};

const getLocal = (key: string) => {
  try {
    const val = localStorage.getItem(key);
    return val ? JSON.parse(val) : [];
  } catch { return []; }
};

export const apiService = {
  getCenterTests: async (): Promise<CenterTest[]> => {
    const res = await safeFetch(`${API_BASE_URL}/tests`);
    if (res && res.ok) {
      try {
        const data = await res.json();
        localStorage.setItem('cached_tests', JSON.stringify(data));
        return data;
      } catch { return getLocal('cached_tests'); }
    }
    return getLocal('cached_tests');
  },

  saveCenterTest: async (test: any): Promise<any> => {
    const res = await safeFetch(`${API_BASE_URL}/tests`, {
      method: 'POST',
      body: JSON.stringify(test),
    });
    return res ? await res.json() : null;
  },

  getAllResults: async (): Promise<QuizResult[]> => {
    const res = await safeFetch(`${API_BASE_URL}/results`);
    if (res && res.ok) {
      try { return await res.json(); } catch { return getLocal('local_results'); }
    }
    return getLocal('local_results');
  },

  saveResult: async (result: QuizResult) => {
    // Lokal saqlash har doim ishlasin
    const local = getLocal('local_results');
    local.unshift(result);
    localStorage.setItem('local_results', JSON.stringify(local.slice(0, 50)));

    await safeFetch(`${API_BASE_URL}/results`, {
      method: 'POST',
      body: JSON.stringify(result),
    });
    return true;
  },

  getUsers: async (): Promise<User[]> => {
    const res = await safeFetch(`${API_BASE_URL}/users`);
    return res && res.ok ? await res.json() : [];
  },

  login: async (email: string | undefined, fullName: string, phone: string, school: string, interest: string, additionalCenter?: string): Promise<User> => {
    const isAdmin = email?.toLowerCase().trim() === 'dostonbekacademy@gmail.com';
    const userData: User = {
      fullName,
      email: email || '',
      phone,
      school,
      interest,
      additionalCenter,
      role: isAdmin ? 'ADMIN' : 'STUDENT',
      isLoggedIn: true
    };

    if (!isAdmin) {
      await safeFetch(`${API_BASE_URL}/users`, {
        method: 'POST',
        body: JSON.stringify(userData),
      });
    }

    localStorage.setItem('current_user', JSON.stringify(userData));
    return userData;
  },

  logout: () => localStorage.removeItem('current_user'),
  getCurrentUser: (): User | null => {
    const u = localStorage.getItem('current_user');
    if (!u) return null;
    try { return JSON.parse(u); } catch { return null; }
  }
};
