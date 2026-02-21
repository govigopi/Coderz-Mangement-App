import axios, { type AxiosInstance } from 'axios'

// Use relative /api when served from same server (one URL); else override with VITE_API_URL
const baseURL = import.meta.env.VITE_API_URL || '/api'
const TOKEN_KEY = 'token'
const REFRESH_TOKEN_KEY = 'refreshToken'
const USER_KEY = 'user'
const REMEMBER_ME_KEY = 'rememberMe'

export const api: AxiosInstance = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' },
})

const serverOrigin = baseURL.startsWith('http') ? baseURL.replace(/\/api\/?$/, '') : ''
let refreshPromise: Promise<AuthResponse> | null = null

function getStoredValue(key: string): string | null {
  return localStorage.getItem(key) ?? sessionStorage.getItem(key)
}

function clearStorage(storage: Storage) {
  storage.removeItem(TOKEN_KEY)
  storage.removeItem(REFRESH_TOKEN_KEY)
  storage.removeItem(USER_KEY)
  storage.removeItem(REMEMBER_ME_KEY)
}

export function getStoredToken(): string | null {
  return getStoredValue(TOKEN_KEY)
}

export function getStoredRefreshToken(): string | null {
  return getStoredValue(REFRESH_TOKEN_KEY)
}

export function getStoredUserRaw(): string | null {
  return getStoredValue(USER_KEY)
}

export function getRememberMeFlag(): boolean {
  return getStoredValue(REMEMBER_ME_KEY) === 'true'
}

export function setAuthSession(data: AuthResponse, rememberMe: boolean) {
  const activeStorage = rememberMe ? localStorage : sessionStorage
  const inactiveStorage = rememberMe ? sessionStorage : localStorage
  clearStorage(inactiveStorage)
  activeStorage.setItem(TOKEN_KEY, data.token)
  activeStorage.setItem(REFRESH_TOKEN_KEY, data.refreshToken)
  activeStorage.setItem(USER_KEY, JSON.stringify(data.user))
  activeStorage.setItem(REMEMBER_ME_KEY, String(rememberMe))
}

export function clearAuthSession() {
  clearStorage(localStorage)
  clearStorage(sessionStorage)
}

function shouldSkipRefresh(url?: string) {
  if (!url) return false
  return [
    '/auth/login',
    '/auth/superadmin/login',
    '/auth/admin/login',
    '/auth/staff/login',
    '/auth/refresh',
  ].some((p) => url.includes(p))
}

async function refreshAccessToken(): Promise<AuthResponse> {
  const refreshToken = getStoredRefreshToken()
  if (!refreshToken) {
    const err = new Error('Missing refresh token')
    ;(err as { status?: number }).status = 401
    throw err
  }
  const { data } = await axios.post<AuthResponse>(`${baseURL}/auth/refresh`, { refreshToken })
  setAuthSession(data, getRememberMeFlag())
  return data
}

api.interceptors.request.use((config) => {
  const token = getStoredToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (r) => r,
  async (err) => {
    const originalRequest = err?.config as { _retry?: boolean; url?: string; headers?: Record<string, string> } | undefined
    if (err.response?.status === 401 && originalRequest && !originalRequest._retry && !shouldSkipRefresh(originalRequest.url)) {
      originalRequest._retry = true
      try {
        if (!refreshPromise) {
          refreshPromise = refreshAccessToken().finally(() => {
            refreshPromise = null
          })
        }
        const refreshed = await refreshPromise
        originalRequest.headers = originalRequest.headers || {}
        originalRequest.headers.Authorization = `Bearer ${refreshed.token}`
        return api(originalRequest)
      } catch (refreshError) {
        clearAuthSession()
        if (window.location.pathname !== '/login') window.location.href = '/login'
        return Promise.reject(refreshError)
      }
    }
    return Promise.reject(err)
  }
)

export const auth = {
  login: (email: string, password: string, role: 'superadmin' | 'admin' | 'staff' = 'admin', rememberMe = false) => {
    const endpoint = role === 'superadmin'
      ? '/auth/superadmin/login'
      : role === 'admin'
        ? '/auth/admin/login'
        : '/auth/staff/login'
    return api.post<AuthResponse>(endpoint, { email, password, rememberMe })
  },
  refresh: (refreshToken: string) => api.post<AuthResponse>('/auth/refresh', { refreshToken }),
  logout: (refreshToken?: string) => api.post<{ message: string }>('/auth/logout', { refreshToken }),
  me: () => api.get<{ user: User }>('/auth/me'),
  registerUser: (data: { name: string; email: string; password: string; role: 'admin' | 'staff' }) =>
    api.post<AuthResponse>('/auth/register', data),
  listManagedUsers: () => api.get<User[]>('/auth/staff-users'),
  updateManagedUser: (id: string, data: { name: string; email: string; password?: string; role: 'admin' | 'staff' }) =>
    api.put<User>(`/auth/staff-users/${id}`, data),
  deleteManagedUser: (id: string) =>
    api.delete<{ message: string }>(`/auth/staff-users/${id}`),
}

export const coursesApi = {
  list: () => api.get<Course[]>('/courses'),
  get: (id: string) => api.get<Course>(`/courses/${id}`),
  create: (data: Partial<Course>) => api.post<Course>('/courses', data),
  update: (id: string, data: Partial<Course>) => api.put<Course>(`/courses/${id}`, data),
  delete: (id: string) => api.delete(`/courses/${id}`),
}

export const enquiriesApi = {
  list: (params?: { status?: string; search?: string }) =>
    api.get<Enquiry[]>('/enquiries', { params }),
  create: (data: Partial<Enquiry>) => api.post<Enquiry>('/enquiries', data),
  update: (id: string, data: Partial<Enquiry>) => api.put<Enquiry>(`/enquiries/${id}`, data),
  delete: (id: string) => api.delete(`/enquiries/${id}`),
}

export const studentsApi = {
  list: (params?: { status?: string; search?: string }) =>
    api.get<Student[]>('/students', { params }),
  get: (id: string) => api.get<Student>(`/students/${id}`),
  create: (data: Partial<Student>) => api.post<Student>('/students', data),
  update: (id: string, data: Partial<Student>) => api.put<Student>(`/students/${id}`, data),
  delete: (id: string) => api.delete(`/students/${id}`),
}

export const invoicesApi = {
  list: (params?: { studentId?: string; status?: string }) =>
    api.get<Invoice[]>('/invoices', { params }),
  get: (id: string) => api.get<Invoice>(`/invoices/${id}`),
  create: (data: { studentId: string; amount: number; description?: string; dueDate?: string }) =>
    api.post<Invoice>('/invoices', data),
  pay: (id: string, amount: number, paymentMethod?: string, paymentDate?: string) =>
    api.post<{ invoice: Invoice; payment: PaymentReceipt }>(`/invoices/${id}/pay`, { amount, paymentMethod, paymentDate }),
  payments: (studentId?: string) =>
    api.get<PaymentHistory[]>('/invoices/payments', { params: studentId ? { studentId } : {} }),
}

export const expensesApi = {
  list: (params?: { startDate?: string; endDate?: string; category?: string }) =>
    api.get<Expense[]>('/expenses', { params }),
  create: (data: Partial<Expense>) => api.post<Expense>('/expenses', data),
  update: (id: string, data: Partial<Expense>) => api.put<Expense>(`/expenses/${id}`, data),
  delete: (id: string) => api.delete(`/expenses/${id}`),
}

export const incomeApi = {
  list: (params?: { startDate?: string; endDate?: string }) =>
    api.get<Income[]>('/income', { params }),
  create: (data: Partial<Income>) => api.post<Income>('/income', data),
}

export const marksApi = {
  list: (params?: { studentId?: string; subject?: string; term?: string }) =>
    api.get<Mark[]>('/marks', { params }),
  create: (data: Partial<Mark>) => api.post<Mark>('/marks', data),
  update: (id: string, data: Partial<Mark>) => api.put<Mark>(`/marks/${id}`, data),
  delete: (id: string) => api.delete(`/marks/${id}`),
}

export const staffActivitiesApi = {
  me: (params?: { date?: string; type?: StaffActivityType | ''; status?: StaffActivityStatus | ''; search?: string }) =>
    api.get<StaffActivity[]>('/staff-activities/me', { params }),
  list: (params?: {
    dateFrom?: string
    dateTo?: string
    staffId?: string
    type?: StaffActivityType | ''
    status?: StaffActivityStatus | ''
    search?: string
  }) => api.get<StaffActivity[]>('/staff-activities', { params }),
  summary: (params?: { dateFrom?: string; dateTo?: string }) =>
    api.get<StaffActivitySummaryRow[]>('/staff-activities/summary', { params }),
  create: (data: {
    activityDate: string
    type: StaffActivityType
    title: string
    notes?: string
    studentName?: string
    status: StaffActivityStatus
  }) => api.post<StaffActivity>('/staff-activities', data),
  update: (id: string, data: Partial<{
    activityDate: string
    type: StaffActivityType
    title: string
    notes: string
    studentName: string
    status: StaffActivityStatus
  }>) => api.put<StaffActivity>(`/staff-activities/${id}`, data),
  delete: (id: string) => api.delete(`/staff-activities/${id}`),
}

export const reportsApi = {
  dashboard: () => api.get<DashboardData>('/reports/dashboard'),
  monthlyIncome: () => api.get<{ _id: { year: number; month: number }; total: number }[]>('/reports/monthly-income'),
  revenuePerStudent: () => api.get<RevenuePerStudent>('/reports/revenue-per-student'),
  incomeExpense: (params?: { startDate?: string; endDate?: string }) =>
    api.get<IncomeExpenseSummary>('/reports/income-expense', { params }),
  businessSummary: (params?: { year?: number; month?: number; courseId?: string; mode?: string }) =>
    api.get<BusinessSummary>('/reports/business-summary', { params }),
}

// Paths for PDF/Excel downloads (relative to baseURL /api when same-origin)
export function invoicePdfUrl(id: string) {
  return serverOrigin ? `${serverOrigin}/api/reports/invoice-pdf/${id}` : `reports/invoice-pdf/${id}`
}

export function marksPdfUrl(studentId: string) {
  return serverOrigin ? `${serverOrigin}/api/reports/marks-pdf/${studentId}` : `reports/marks-pdf/${studentId}`
}

export function incomeExpenseExcelUrl(params?: { startDate?: string; endDate?: string }) {
  const q = new URLSearchParams(
    Object.entries(params || {}).reduce((acc, [k, v]) => {
      if (v) acc[k] = v
      return acc
    }, {} as Record<string, string>)
  ).toString()
  const path = `reports/income-expense-excel${q ? '?' + q : ''}`
  return serverOrigin ? `${serverOrigin}/api/${path}` : path
}

/** Fetch a file with auth and return a blob URL for opening/download */
export async function downloadWithAuth(url: string): Promise<string> {
  const res = await api.get(url, { responseType: 'blob' })
  return URL.createObjectURL(res.data as Blob)
}

/** Download a file with auth and force a local filename */
export async function saveFileWithAuth(url: string, fileName: string): Promise<void> {
  const res = await api.get(url, { responseType: 'blob' })
  const blobUrl = URL.createObjectURL(res.data as Blob)
  const a = document.createElement('a')
  a.href = blobUrl
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(blobUrl)
}

export interface User {
  id: string
  name: string
  email: string
  role: string
}

export interface AuthResponse {
  token: string
  refreshToken: string
  user: User
}

export interface Course {
  _id: string
  name: string
  duration?: string
  fee: number
  description?: string
}

export interface Enquiry {
  _id: string
  name: string
  phoneNumber: string
  course: string
  qualification: string
  status: 'joined' | 'not_joined'
}

export interface Student {
  _id: string
  rollNo: string
  name: string
  email?: string
  mobile: string
  qualification?: string
  dateOfBirth?: string
  mode?: 'online' | 'offline'
  guardianName?: string
  guardianMobile?: string
  address?: string
  admissionDate: string
  courses: Course[]
  courseFee?: number
  totalFees: number
  paidAmount: number
  pendingAmount: number
  status: string
  certificateIssued?: boolean
}

export interface Invoice {
  _id: string
  studentId: { _id: string; rollNo?: string; name?: string; mobile?: string; email?: string; address?: string } | string
  amount: number
  paidAmount: number
  date: string
  dueDate?: string
  status: string
  description?: string
  invoiceNumber?: string
}

export interface PaymentHistory {
  _id: string
  date: string
  amountPaid: number
  billNo: string | null
  invoiceAmount: number
  alreadyPaid: number
  invoiceId: string | null
  invoiceNumber: string | null
  paymentMethod?: string
  remainingPending: number | null
  student?: { _id: string; rollNo?: string; name?: string; mobile?: string } | null
}

export interface PaymentReceipt {
  _id: string
  date: string
  billNo: string
  amountPaid: number
  alreadyPaid: number
  remainingPending: number
  invoiceId: string
  invoiceNumber?: string
  paymentMethod?: string
}

export interface Expense {
  _id: string
  amount: number
  date: string
  category?: string
  description: string
}

export interface Income {
  _id: string
  amount: number
  date: string
  source?: string
  description?: string
  studentId?: { name?: string }
}

export interface Mark {
  _id: string
  studentId: string | { _id: string; name?: string }
  subject: string
  marks: number
  maxMarks: number
  examDate: string
  term?: string
}

export type StaffActivityType =
  | 'call'
  | 'follow_up'
  | 'admission'
  | 'fee_collection'
  | 'class_support'
  | 'other'

export type StaffActivityStatus = 'pending' | 'completed'

export interface StaffActivity {
  _id: string
  staffId: string | { _id: string; name?: string; email?: string; role?: string }
  activityDate: string
  type: StaffActivityType
  title: string
  notes?: string
  studentName?: string
  status: StaffActivityStatus
  createdAt: string
  updatedAt: string
}

export interface StaffActivitySummaryRow {
  staffId: string
  staffName: string
  staffEmail: string
  total: number
  completed: number
  pending: number
  lastActivityAt: string
}

export interface DashboardData {
  totalStudents: number
  activeStudents: number
  monthlyIncome: number
  monthlyExpense: number
  monthlyProfit: number
  totalPendingFees: number
  todayIncome: number
  todayExpense: number
}

export interface RevenuePerStudent {
  totalRevenue: number
  activeStudentCount: number
  revenuePerStudent: number
  students?: { id: string; name: string; paidAmount: number; totalFees: number; pendingAmount: number }[]
}

export interface IncomeExpenseSummary {
  income: number
  expense: number
  profit: number
  startDate: string
  endDate: string
}

export interface BusinessSummary {
  filters: { year: number; month: number | null; courseId?: string; mode?: string }
  summary: {
    businessValue: number
    collection: number
    expense: number
    profit: number
    admissions: number
    activeStudents: number
    pendingFees: number
  }
  monthWise: Array<{
    month: number
    income: number
    expense: number
    profit: number
    admissions: number
    businessValue: number
    avgFeePerAdmission: number
  }>
  courseBreakdown: Array<{
    courseName: string
    admissions: number
    totalFee: number
    collected: number
    pending: number
  }>
  topPaid: Array<{ rollNo: string; name: string; amount: number }>
  topPending: Array<{ rollNo: string; name: string; amount: number }>
  yearlySummary: Array<{
    year: number
    businessValue: number
    collection: number
    expense: number
    profit: number
    admissions: number
  }>
  growth: {
    momCollectionPct: number | null
    yoyCollectionPct: number
    momAdmissionsPct: number | null
    yoyAdmissionsPct: number
  }
}

