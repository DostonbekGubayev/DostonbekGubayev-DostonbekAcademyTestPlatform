
import { QuizResult, User, CenterTest } from './types';

const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || '/api';

const safeFetch = async (url: string, options: any = {}) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

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
    console.warn("API Connection Issue:", url, e);
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
  // Admin xizmatlari
  sendAdminCode: async (email: string) => {
    return await safeFetch(`${API_BASE_URL}/admin/send-code`, {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  verifyAdminCode: async (email: string, code: string) => {
    const res = await safeFetch(`${API_BASE_URL}/admin/verify-code`, {
      method: 'POST',
      body: JSON.stringify({ email, code }),
    });
    return res && res.ok;
  },

  getCenterTests: async (): Promise<CenterTest[]> => {
    const res = await safeFetch(`${API_BASE_URL}/tests`);
    if (res && res.ok) {
      const data = await res.json();
      localStorage.setItem('cached_tests', JSON.stringify(data));
      return data;
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

  updateCenterTest: async (id: string, test: any): Promise<any> => {
    const res = await safeFetch(`${API_BASE_URL}/tests/${id}`, {
      method: 'PUT',
      body: JSON.stringify(test),
    });
    return res ? await res.json() : null;
  },

  deleteCenterTest: async (id: string): Promise<any> => {
    const res = await safeFetch(`${API_BASE_URL}/tests/${id}`, {
      method: 'DELETE',
    });
    return res ? await res.json() : null;
  },

  getAllResults: async (): Promise<QuizResult[]> => {
    const res = await safeFetch(`${API_BASE_URL}/results`);
    if (res && res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        return data.map((r: any) => ({
          ...r,
          userName: r.user_name || r.userName,
          answeredCount: r.answered_count || r.answeredCount,
          totalQuestions: r.total_questions || r.totalQuestions,
          testType: r.test_type || r.testType,
          timeSpent: r.time_spent || r.timeSpent,
          date: r.created_at || r.date
        }));
      }
    }
    return getLocal('local_results');
  },

  saveResult: async (result: QuizResult) => {
    const local = getLocal('local_results');
    local.unshift(result);
    localStorage.setItem('local_results', JSON.stringify(local.slice(0, 50)));

    await safeFetch(`${API_BASE_URL}/results`, {
      method: 'POST',
      body: JSON.stringify({
        userName: result.userName,
        email: result.email,
        score: result.score,
        answeredCount: result.answeredCount,
        totalQuestions: result.totalQuestions,
        category: result.category,
        subTopic: result.subTopic,
        testType: result.testType,
        timeSpent: result.timeSpent,
        answers: result.answers
      }),
    });
    return true;
  },

  getUsers: async (): Promise<User[]> => {
    const res = await safeFetch(`${API_BASE_URL}/users`);
    if (res && res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        return data.map((u: any) => ({
          id: u.id,
          fullName: u.full_name || u.fullName,
          email: u.email,
          phone: u.phone,
          school: u.school,
          interest: u.interest,
          additionalCenter: u.additional_center || u.additionalCenter,
          role: u.role,
          createdAt: u.created_at
        }));
      }
    }
    return [];
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
      try {
        await safeFetch(`${API_BASE_URL}/users`, {
          method: 'POST',
          body: JSON.stringify({
            fullName: userData.fullName,
            email: userData.email,
            phone: userData.phone,
            school: userData.school,
            interest: userData.interest,
            role: userData.role,
            additionalCenter: userData.additionalCenter
          }),
        });
      } catch (e) {
        console.warn("Silent DB sync failure");
      }
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
