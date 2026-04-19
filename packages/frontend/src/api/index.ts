import client from './client';

// Auth
export const authApi = {
  register: (data: { email: string; password: string; name: string }) => client.post('/auth/register', data),
  login: (data: { email: string; password: string }) => client.post('/auth/login', data),
};

// Users
export const usersApi = {
  me: () => client.get('/users/me'),
  update: (data: object) => client.patch('/users/me', data),
};

// Families
export const familiesApi = {
  create: (name: string) => client.post('/families', { name }),
  get: (id: number) => client.get(`/families/${id}`),
  join: (invite_code: string) => client.post('/families/join', { invite_code }),
  members: (id: number) => client.get(`/families/${id}/members`),
  inviteCode: (id: number) => client.get(`/families/${id}/invite-code`),
};

// Categories
export const categoriesApi = {
  list: () => client.get('/categories'),
  create: (data: object) => client.post('/categories', data),
  update: (id: number, data: object) => client.patch(`/categories/${id}`, data),
  delete: (id: number) => client.delete(`/categories/${id}`),
};

// Transactions
export const transactionsApi = {
  list: (params?: object) => client.get('/transactions', { params }),
  summary: (params?: object) => client.get('/transactions/summary', { params }),
  create: (data: object) => client.post('/transactions', data),
  update: (id: number, data: object) => client.patch(`/transactions/${id}`, data),
  delete: (id: number) => client.delete(`/transactions/${id}`),
};

// Savings
export const savingsApi = {
  listAccounts: () => client.get('/savings/accounts'),
  createAccount: (data: object) => client.post('/savings/accounts', data),
  updateAccount: (id: number, data: object) => client.patch(`/savings/accounts/${id}`, data),
  deleteAccount: (id: number) => client.delete(`/savings/accounts/${id}`),
  listMovements: (id: number) => client.get(`/savings/accounts/${id}/movements`),
  createMovement: (id: number, data: object) => client.post(`/savings/accounts/${id}/movements`, data),
  deleteMovement: (id: number, movId: number) => client.delete(`/savings/accounts/${id}/movements/${movId}`),
};

// Investments
export const investmentsApi = {
  listPortfolios: () => client.get('/investments/portfolios'),
  createPortfolio: (data: object) => client.post('/investments/portfolios', data),
  createAsset: (portfolioId: number, data: object) => client.post(`/investments/portfolios/${portfolioId}/assets`, data),
  updateAsset: (assetId: number, data: object) => client.patch(`/investments/assets/${assetId}`, data),
  deleteAsset: (assetId: number) => client.delete(`/investments/assets/${assetId}`),
  assetProjection: (assetId: number, months?: number) => client.get(`/investments/assets/${assetId}/projection`, { params: { months } }),
  alerts: () => client.get('/investments/alerts'),
  markAlertRead: (id: number) => client.patch(`/investments/alerts/${id}/read`),
};

// Budgets
export const budgetsApi = {
  list: () => client.get('/budgets'),
  create: (data: object) => client.post('/budgets', data),
  update: (id: number, data: object) => client.patch(`/budgets/${id}`, data),
  delete: (id: number) => client.delete(`/budgets/${id}`),
};

// Analytics
export const analyticsApi = {
  healthScore: () => client.get('/analytics/health-score'),
  daily: (params?: object) => client.get('/analytics/daily', { params }),
  weeklyProjection: (weeks?: number) => client.get('/analytics/weekly-projection', { params: { weeks } }),
  categoryBreakdown: (params?: object) => client.get('/analytics/category-breakdown', { params }),
  trend: (months?: number) => client.get('/analytics/income-expense-trend', { params: { months } }),
};

// Notifications
export const notificationsApi = {
  list: (unreadOnly?: boolean) => client.get('/notifications', { params: unreadOnly ? { unread_only: true } : undefined }),
  readAll: () => client.patch('/notifications/read-all'),
  markRead: (id: number) => client.patch(`/notifications/${id}/read`),
};

// Export
export const exportApi = {
  csv: (params?: object) => client.get('/export/csv', { params, responseType: 'blob' }),
};
