import axios from 'axios';

const authService = {
  login: async (credentials) => {
    const response = await axios.post('/api/supervisor/login', credentials);
    if (response.data.success) {
      localStorage.setItem('supervisor_token', response.data.token);
      localStorage.setItem('supervisor_user', JSON.stringify(response.data.supervisor));
    }
    return response.data;
  },

  logout: () => {
    localStorage.removeItem('supervisor_token');
    localStorage.removeItem('supervisor_user');
  },

  getToken: () => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('supervisor_token');
    }
    return null;
  },

  getCurrentSupervisor: () => {
    if (typeof window !== 'undefined') {
      const userStr = localStorage.getItem('supervisor_user');
      if (userStr) {
        try {
          return JSON.parse(userStr);
        } catch (e) {
          return null;
        }
      }
    }
    return null;
  }
};

export default authService;
