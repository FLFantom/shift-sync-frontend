// ==========================================================
// ФИНАЛЬНАЯ ВЕРСИЯ - СКОПИРУЙ ВСЁ И ЗАМЕНИ ВЕСЬ ФАЙЛ
// ==========================================================

const API_BASE_URL = 'https://gelding-able-sailfish.ngrok-free.app/webhook';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
}

export interface LoginResponse {
  success: boolean;
  data?: {
    message: string;
    user: User;
    token: string;
  };
  error?: string;
}

export interface RegisterResponse {
  success: boolean;
  data?: {
    message: string;
    user: User;
    token: string;
  };
  error?: string;
}

export interface TimeActionRequest {
  action: 'start_work' | 'start_break' | 'end_break' | 'end_work';
  break_duration?: number;
}

export interface User {
  id: number;
  email: string;
  name: string;
  role: 'user' | 'admin';
  status?: 'working' | 'break' | 'offline';
  breakStartTime?: string;
}

export interface UserLog {
  id: string;
  action: string;
  timestamp: string;
  break_duration?: number;
  name: string;
  email: string;
}

// Custom error types
class AuthError extends Error {
  constructor(message: string, public status: number) {
    super(message);
    this.name = 'AuthError';
  }
}

// УНИВЕРСАЛЬНЫЙ ОБРАБОТЧИК ЗАПРОСОВ
async function makeApiRequest<T>(url: string, options: RequestInit): Promise<T> {
  const response = await fetch(url, options);

  const responseText = await response.text();
  
  if (!response.ok) {
    let errorMessage = `HTTP Error ${response.status}`;
    try {
      const errorJson = JSON.parse(responseText);
      errorMessage = errorJson.message || errorJson.error || errorMessage;
    } catch (e) {
      // Игнорируем ошибку парсинга, используем стандартное сообщение
    }
    
    if (response.status === 401 || response.status === 403) {
        throw new AuthError(errorMessage, response.status);
    }
    throw new Error(errorMessage);
  }

  // Если тело ответа пустое, возвращаем пустой объект,
  // чтобы последующие операции не ломались
  if (!responseText) {
    return {} as T;
  }
  
  try {
    return JSON.parse(responseText) as T;
  } catch (e) {
    throw new Error('Invalid JSON response from server');
  }
}


class ApiClient {
  private getToken() {
    return localStorage.getItem('token');
  }

  private getAuthHeaders() {
    const token = this.getToken();
    return {
      'Content-Type': 'application/json',
      'ngrok-skip-browser-warning': 'true',
      ...(token && { 'Authorization': `Bearer ${token}` })
    };
  }
  
  async register(data: RegisterRequest): Promise<RegisterResponse> {
    return makeApiRequest<RegisterResponse>(`${API_BASE_URL}/register-user`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true'
      },
      body: JSON.stringify(data)
    });
  }

  async login(data: LoginRequest): Promise<LoginResponse> {
    const response = await makeApiRequest<LoginResponse>(`${API_BASE_URL}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true'
        },
        body: JSON.stringify(data)
    });
    
    if (response.success && response.data) {
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
    }
    
    return response;
  }

  async timeAction(data: TimeActionRequest): Promise<any> {
    return makeApiRequest(`${API_BASE_URL}/time-action`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data)
    });
  }

  // ФИНАЛЬНАЯ, ЧИСТАЯ ВЕРСИЯ
  async getAllUsers(): Promise<User[]> {
    console.log('[getAllUsers] Fetching users...');
    const result = await makeApiRequest<any>(`${API_BASE_URL}/admin/users`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    });
    
    // Ожидаем ТОЛЬКО массив. Если это не массив - это ошибка.
    if (!Array.isArray(result)) {
      console.error('[getAllUsers] Ошибка: API не вернул массив пользователей. Получено:', result);
      throw new Error('Сервер вернул некорректные данные (ожидался массив).');
    }
    
    console.log(`[getAllUsers] Получен массив из ${result.length} пользователей.`);
    
    // Нормализуем данные
    return result.map((user: any) => ({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        status: user.status || 'offline',
        breakStartTime: user.breakStartTime
    }));
  }

  async updateUser(userId: number, data: { name: string; role: string }): Promise<any> {
    return makeApiRequest(`${API_BASE_URL}/admin/user/${userId}`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data)
    });
  }

  async deleteUser(userId: number): Promise<any> {
    return makeApiRequest(`${API_BASE_URL}/admin/user/${userId}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders()
    });
  }

  async getUserLogs(userId: number): Promise<UserLog[]> {
    return makeApiRequest<UserLog[]>(`${API_BASE_URL}/admin/user/${userId}/logs`, {
      method: 'GET',
      headers: this.getAuthHeaders()
    });
  }
  
  async notifyBreakExceeded(data: { userId: number; userName: string; userEmail: string; breakDurationMinutes: number }) {
    return makeApiRequest(`${API_BASE_URL}/notify-break-exceeded`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(data)
    });
  }

  async reportLateness(data: { userId: number; userName: string; userEmail: string; startTime: string; lateMinutes: number }) {
    return makeApiRequest(`${API_BASE_URL}/lateness-report`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(data)
    });
  }

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  }
}

export const apiClient = new ApiClient();
