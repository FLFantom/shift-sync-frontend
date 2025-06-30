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

  // ОБНОВЛЕННАЯ ФУНКЦИЯ
  private async handleResponse(response: Response) {
    console.log(`[handleResponse] Status: ${response.status} for ${response.url}`);
    
    const responseText = await response.text();
    console.log('[handleResponse] Raw text:', responseText);

    if (!response.ok) {
      // Обработка HTTP ошибок (4xx, 5xx)
      console.error('[handleResponse] HTTP error occurred!');
      // Попытка извлечь сообщение об ошибке из JSON
      try {
        const errorJson = JSON.parse(responseText);
        const message = errorJson.message || errorJson.error || 'Unknown server error';
        if (response.status === 401) throw new AuthError(message, 401);
        if (response.status === 403) throw new AuthError(message, 403);
        throw new Error(message);
      } catch (e) {
        // Если это не JSON или ошибка другого типа, возвращаем как есть
        if (e instanceof AuthError) throw e;
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    }
    
    // Если ответ пустой (например, при DELETE запросе), возвращаем пустой объект
    if (!responseText) {
      console.log('[handleResponse] Response is empty, returning { success: true }.');
      return { success: true };
    }
    
    // Пытаемся распарсить ответ как JSON
    try {
      const jsonData = JSON.parse(responseText);
      console.log('[handleResponse] Parsed JSON:', jsonData);
      
      // Обработка логических ошибок (когда HTTP статус 200, но success: false)
      if (jsonData.success === false) {
        console.error('[handleResponse] Logical error in response:', jsonData.error);
        throw new Error(jsonData.error || 'Request failed');
      }
      
      return jsonData;
    } catch (parseError) {
      if (parseError instanceof Error && parseError.message !== 'Request failed') {
        console.error('[handleResponse] Failed to parse JSON!', parseError);
        throw new Error('Invalid JSON response from server');
      }
      throw parseError; // Перебрасываем логическую ошибку
    }
  }

  async register(data: RegisterRequest): Promise<RegisterResponse> {
    const response = await fetch(`${API_BASE_URL}/register-user`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true'
      },
      body: JSON.stringify(data)
    });

    const result = await this.handleResponse(response);
    return result as RegisterResponse;
  }

  async login(data: LoginRequest): Promise<LoginResponse> {
    const response = await fetch(`${API_BASE_URL}/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true'
      },
      body: JSON.stringify(data)
    });

    const result = await this.handleResponse(response);
    
    if (result.success && result.data) {
      localStorage.setItem('token', result.data.token);
      localStorage.setItem('user', JSON.stringify(result.data.user));
    }
    
    return result as LoginResponse;
  }

  async timeAction(data: TimeActionRequest) {
    const requestBody: any = { action: data.action };
    
    if (data.break_duration !== undefined && (data.action === 'end_break' || data.action === 'start_break')) {
      requestBody.break_duration = data.break_duration;
    }
    
    const response = await fetch(`${API_BASE_URL}/time-action`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(requestBody)
    });

    return this.handleResponse(response);
  }

  // ОБНОВЛЕННАЯ ФУНКЦИЯ
   async getAllUsers(): Promise<User[]> {
    console.log('[getAllUsers] Fetching users...');
    const response = await fetch(`${API_BASE_URL}/admin/users`, {
      method: 'GET',
      headers: this.getAuthHeaders()
    });

    const result = await this.handleResponse(response);

    let usersData: any[] = [];

    // ГЛАВНАЯ ПРОВЕРКА: ЕСЛИ ПРИШЕЛ МАССИВ
    if (Array.isArray(result)) {
      console.log('[getAllUsers] Получен массив пользователей.');
      usersData = result;
    } 
    // НОВАЯ ПРОВЕРКА: ЕСЛИ ПРИШЕЛ ОДИН ОБЪЕКТ, А НЕ МАССИВ
    else if (typeof result === 'object' && result !== null && result.id) {
        console.log('[getAllUsers] Получен один объект пользователя, превращаем в массив.');
        usersData = [result]; // Просто оборачиваем его в массив
    }
    // Запасной вариант, если n8n вдруг вернет обертку { success: true, data: [...] }
    else if (result && result.success && Array.isArray(result.data)) {
      console.log('[getAllUsers] Получена обертка { success, data }');
      usersData = result.data;
    } else {
      console.error('[getAllUsers] Неожиданная структура данных:', result);
      throw new Error('Получена неожиданная структура данных от сервера.');
    }
    
    // Преобразуем данные в наш формат User
    return usersData.map(user => ({
      id: user.id || user.userId,
      email: user.email,
      name: user.name || user.fullName || this.extractNameFromEmail(user.email),
      role: user.role || 'user',
      status: user.status || 'offline',
      breakStartTime: user.breakStartTime
    }));
  }

  private extractNameFromEmail(email: string): string {
    if (!email) return 'Неизвестный пользователь';
    
    const localPart = email.split('@')[0];
    return localPart
      .split(/[._-]/)
      .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join(' ');
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
    return Array.isArray(result) ? result : []; // Упрощенная обработка
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
