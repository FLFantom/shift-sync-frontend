
const API_BASE_URL = 'https://gelding-able-sailfish.ngrok-free.app/webhook';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  message?: string;
  user?: {
    id: number;
    email: string;
    name: string;
    role: 'user' | 'admin';
  };
  token?: string;
  error?: string;
}

export interface TimeActionRequest {
  action: 'start_work' | 'start_break' | 'end_break' | 'end_work';
  breakDuration?: number;
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
  details?: string;
}

// Custom error types
class AuthError extends Error {
  constructor(message: string, public status: number) {
    super(message);
    this.name = 'AuthError';
  }
}

class ValidationError extends Error {
  constructor(message: string, public status: number) {
    super(message);
    this.name = 'ValidationError';
  }
}

class ApiClient {
  private getToken() {
    const tokenData = localStorage.getItem('token');
    if (!tokenData) return null;
    
    // В будущем можно добавить проверку срока действия токена
    return tokenData;
  }

  private getAuthHeaders() {
    const token = this.getToken();
    return {
      'Content-Type': 'application/json',
      'ngrok-skip-browser-warning': 'true',
      ...(token && { 'Authorization': `Bearer ${token}` })
    };
  }

  private async handleResponse(response: Response) {
    // Специальная обработка статусов ошибок
    switch (response.status) {
      case 401:
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
        throw new AuthError('Session expired', 401);
      case 403:
        throw new AuthError('Insufficient permissions', 403);
      case 422:
        const errorData = await response.json().catch(() => ({}));
        throw new ValidationError(errorData.error?.message || 'Validation failed', 422);
      case 500:
        throw new Error('Server error occurred');
    }
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`HTTP error! status: ${response.status}, message: ${error}`);
    }
    
    // Проверяем, есть ли содержимое для парсинга
    const text = await response.text();
    if (!text) {
      return { success: true };
    }
    
    try {
      return JSON.parse(text);
    } catch (error) {
      console.error('Failed to parse JSON:', text);
      throw new Error('Invalid JSON response');
    }
  }

  async login(data: LoginRequest): Promise<LoginResponse> {
    const response = await fetch(`${API_BASE_URL}/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true'
        // НЕ добавляем Authorization header для логина
      },
      body: JSON.stringify(data)
    });

    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.error || 'Login failed');
    }
    
    // Валидация структуры ответа
    if (!result.success || !result.token || !result.user) {
      throw new Error('Invalid login response format');
    }
    
    // Сохраняем токен и данные пользователя
    localStorage.setItem('token', result.token);
    localStorage.setItem('user', JSON.stringify(result.user));
    
    return result;
  }

  async timeAction(data: TimeActionRequest) {
    console.log('Sending time action request:', data);
    
    // КРИТИЧЕСКИ ВАЖНО: НЕ передаем userId в теле запроса
    // userId извлекается из JWT токена на сервере
    const requestBody = {
      action: data.action
    };
    
    // Добавляем breakDuration только для действий с перерывом
    if (data.breakDuration && (data.action === 'end_break' || data.action === 'start_break')) {
      requestBody.break_duration = data.breakDuration;
    }
    
    const response = await fetch(`${API_BASE_URL}/time-action`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(requestBody)
    });

    return this.handleResponse(response);
  }

  async getAllUsers(): Promise<User[]> {
    const response = await fetch(`${API_BASE_URL}/admin/users`, {
      method: 'GET',
      headers: this.getAuthHeaders()
    });

    const result = await this.handleResponse(response);
    
    // Обработка разных форматов ответа
    if (Array.isArray(result)) {
      return result;
    } else if (result.data && Array.isArray(result.data)) {
      return result.data;
    } else if (result.success && result.data) {
      return result.data;
    }
    
    return [];
  }

  async updateUser(userId: number, data: { name: string; role: string }) {
    const response = await fetch(`${API_BASE_URL}/admin/user/${userId}`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data)
    });

    return this.handleResponse(response);
  }

  async deleteUser(userId: number) {
    const response = await fetch(`${API_BASE_URL}/admin/user/${userId}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders()
    });

    return this.handleResponse(response);
  }

  async getUserLogs(userId: number): Promise<UserLog[]> {
    const response = await fetch(`${API_BASE_URL}/admin/user/${userId}/logs`, {
      method: 'GET',
      headers: this.getAuthHeaders()
    });

    const result = await this.handleResponse(response);
    
    // Обработка разных форматов ответа
    if (Array.isArray(result)) {
      return result;
    } else if (result.data && Array.isArray(result.data)) {
      return result.data;
    } else if (result.success && result.data) {
      return result.data;
    }
    
    return [];
  }

  async notifyBreakExceeded(data: { userId: number; userName: string; userEmail: string; breakDurationMinutes: number }) {
    const response = await fetch(`${API_BASE_URL}/notify-break-exceeded`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data)
    });

    return this.handleResponse(response);
  }

  async reportLateness(data: { userId: number; userName: string; userEmail: string; startTime: string; lateMinutes: number }) {
    const response = await fetch(`${API_BASE_URL}/lateness-report`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data)
    });

    return this.handleResponse(response);
  }

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  }
}

export const apiClient = new ApiClient();
