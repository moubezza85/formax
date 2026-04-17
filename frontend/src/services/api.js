import axios from 'axios';

const API_URL = 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_URL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('role');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authService = {
  login: async (username, password) => {
    const params = new URLSearchParams();
    params.append('username', username);
    params.append('password', password);
    const response = await api.post('/auth/login', params);
    if (response.data.access_token) {
      localStorage.setItem('token', response.data.access_token);
      localStorage.setItem('role', response.data.role);
    }
    return response.data;
  },
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
  },
  getCurrentUserRole: () => localStorage.getItem('role'),
};

export const trainingService = {
  getTrainings: async () => {
    const response = await api.get('/trainings/');
    return response.data;
  },
  createTraining: async (data) => {
    const response = await api.post('/trainings/', data);
    return response.data;
  },
  updateTraining: async (id, data) => {
    const response = await api.patch(`/trainings/${id}`, data);
    return response.data;
  },
  deleteTraining: async (id) => {
    const response = await api.delete(`/trainings/${id}`);
    return response.data;
  },
  enrollStudent: async (data) => {
    const response = await api.post('/trainings/enroll', data);
    return response.data;
  },
  launchTraining: async (data) => {
    const response = await api.post('/trainings/launch', data);
    return response.data;
  }
};

export const userService = {
  getStudents: async () => {
    const response = await api.get('/users/students');
    return response.data;
  },
  getTrainers: async () => {
    const response = await api.get('/users/trainers');
    return response.data;
  },
  createStudent: async (data) => {
    const response = await api.post('/users/students', data);
    return response.data;
  },
  createTrainer: async (data) => {
    const response = await api.post('/users/trainers', data);
    return response.data;
  },
  updateUser: async (id, data) => {
    const response = await api.patch(`/users/${id}`, data);
    return response.data;
  },
  deleteUser: async (id) => {
    const response = await api.delete(`/users/${id}`);
    return response.data;
  }
};

export const reportService = {
  getRevenue: async () => {
    const response = await api.get('/reports/revenue');
    return response.data;
  },
  getProfit: async () => {
    const response = await api.get('/reports/profit');
    return response.data;
  },
  getStudentDebt: async () => {
    const response = await api.get('/reports/students/debt');
    return response.data;
  },
  getTrainerPayouts: async () => {
    const response = await api.get('/reports/trainers/payouts');
    return response.data;
  },
  getFormationReport: async (id) => {
    const response = await api.get(`/reports/formation/${id}`);
    return response.data;
  },
  getStudentReport: async (id) => {
    const response = await api.get(`/reports/student/${id}`);
    return response.data;
  },
  getTrainerReport: async (id) => {
    const response = await api.get(`/reports/trainer/${id}`);
    return response.data;
  },
  getPackReport: async (id) => {
    const response = await api.get(`/reports/pack/${id}`);
    return response.data;
  },
  getDashboardStats: async () => {
    const response = await api.get('/reports/dashboard');
    return response.data;
  }
};

export const paymentsService = {
  listAll: async () => {
    const response = await api.get('/payments/');
    return response.data;
  },
  registerStudentPayment: async (data) => {
    const response = await api.post('/payments/student', data);
    return response.data;
  },
  getHistory: async (enrollmentId) => {
    const response = await api.get(`/payments/history/${enrollmentId}`);
    return response.data;
  },
  registerTrainerPayment: async (data) => {
    const response = await api.post('/payments/trainer', data);
    return response.data;
  },
  getTrainerBalance: async (trainerId) => {
    const response = await api.get(`/payments/trainer/${trainerId}`);
    return response.data;
  }
};

export const sessionsService = {
  getAllSessions: async (params = {}) => {
    const response = await api.get('/sessions/', { params });
    return response.data;
  },
  getPlanning: async (params = {}) => {
    const response = await api.get('/sessions/planning', { params });
    return response.data;
  },
  listRooms: async () => {
    const response = await api.get('/sessions/rooms');
    return response.data;
  },
  getSessions: async (training_id) => {
    const response = await api.get(`/sessions/training/${training_id}`);
    return response.data;
  },
  createSession: async (data) => {
    const response = await api.post('/sessions/', data);
    return response.data;
  },
  createPlannedSession: async (data) => {
    const response = await api.post('/sessions/plan', data);
    return response.data;
  },
  updatePlannedSession: async (id, data) => {
    const response = await api.patch(`/sessions/plan/${id}`, data);
    return response.data;
  },
  cancelSession: async (id) => {
    const response = await api.delete(`/sessions/plan/${id}`);
    return response.data;
  },
  completeSession: async (id) => {
    const response = await api.patch(`/sessions/${id}/complete`);
    return response.data;
  },
  getProgress: async (training_id) => {
    const response = await api.get(`/sessions/progress/${training_id}`);
    return response.data;
  }
};

export const roomsService = {
  list: async (activeOnly = true) => {
    const response = await api.get('/rooms/', { params: { active_only: activeOnly } });
    return response.data;
  },
  create: async (data) => {
    const response = await api.post('/rooms/', data);
    return response.data;
  },
  update: async (id, data) => {
    const response = await api.patch(`/rooms/${id}`, data);
    return response.data;
  },
  remove: async (id) => {
    const response = await api.delete(`/rooms/${id}`);
    return response.data;
  }
};

export const attendanceService = {
  recordBulk: async (data) => {
    const response = await api.post('/attendance/bulk', data);
    return response.data;
  },
  getSessionAttendance: async (sessionId) => {
    const response = await api.get(`/attendance/session/${sessionId}`);
    return response.data;
  },
  getTrainingSummary: async (trainingId) => {
    const response = await api.get(`/attendance/training/${trainingId}/summary`);
    return response.data;
  }
};

export const draftsService = {
  getDrafts: async () => {
    const response = await api.get('/wizard/drafts');
    return response.data;
  },
  saveDraft: async (data) => {
    const response = await api.post('/wizard/drafts', data);
    return response.data;
  },
  updateDraft: async (id, data) => {
    const response = await api.put(`/wizard/drafts/${id}`, data);
    return response.data;
  },
  deleteDraft: async (id) => {
    const response = await api.delete(`/wizard/drafts/${id}`);
    return response.data;
  }
};

export const wizardService = {
  searchTrainers: async (q) => {
    const response = await api.get(`/wizard/step2/trainers/search?q=${q}`);
    return response.data;
  },
  searchStudents: async (q) => {
    const response = await api.get(`/wizard/step3/students/search?q=${q}`);
    return response.data;
  },
  getPreview: async (data) => {
    const response = await api.post('/wizard/preview', data);
    return response.data;
  },
  launch: async (data) => {
    const response = await api.post('/wizard/launch', data);
    return response.data;
  }
};

export const packService = {
  getPacks: async () => {
    const response = await api.get('/packs/');
    return response.data;
  },
  createPack: async (data) => {
    const response = await api.post('/packs/', data);
    return response.data;
  },
  updatePack: async (id, data) => {
    const response = await api.patch(`/packs/${id}`, data);
    return response.data;
  },
  deletePack: async (id) => {
    const response = await api.delete(`/packs/${id}`);
    return response.data;
  }
};

export const enrollmentService = {
  listAll: async (filters = {}) => {
    const params = new URLSearchParams(filters);
    const response = await api.get(`/enrollments/?${params.toString()}`);
    return response.data;
  },
  getById: async (id) => {
    const response = await api.get(`/enrollments/${id}`);
    return response.data;
  },
  updateStatus: async (id, status) => {
    const response = await api.patch(`/enrollments/${id}/status?status=${status}`);
    return response.data;
  }
};

export default api;
