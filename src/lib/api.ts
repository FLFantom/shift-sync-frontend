// ==========================================================
// ФИНАЛЬНАЯ ВЕРСИЯ API КЛИЕНТА С УЛУЧШЕННОЙ БЕЗОПАСНОСТЬЮ
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
export class AuthError extends Error {
  constructor(message: string, public status: number) {
    super(message);
    this.name = 'AuthError';
  }
}

export class NetworkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NetworkError';
  }
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

// Валидация JWT токена
function isValidJWT(token: string): boolean {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return false;
    
    // Проверяем что можем декодировать payload
    const payload = JSON.parse(atob(parts[1]));
    
    // Базовая проверка на наличие обязательных полей
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) return false; // Токен истек
    if (payload.nbf && payload.nbf > now) return false; // Токен еще не активен
    
    return true;
  } catch {
    return false;
  }
}

// УНИВЕРСАЛЬНЫЙ ОБРАБОТЧИК ЗАПРОСОВ С УЛУЧШЕННОЙ БЕЗОПАСНОСТЬЮ
async function makeApiRequest<T>(url: string, options: RequestInit): Promise<T> {
  let response: Response;
  
  try {
    // Устанавливаем timeout для запроса
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 секунд

    response = await fetch(url, {
      ...options,
      signal: controller.signal
    });

    clearTimeout(timeoutId);
  } catch (error: any) {
    if (error.name === 'AbortError') {
      throw new NetworkError('Превышено время ожидания ответа сервера');
    }
    throw new NetworkError('Ошибка соединения с сервером');
  }

  let responseText: string;
  try {
    responseText = await response.text();
  } catch (error) {
    throw new NetworkError('Ошибка чтения ответа сервера');
  }
  
  if (!response.ok) {
    let errorMessage = `HTTP Error ${response.status}`;
    
    try {
      if (responseText) {
        const errorJson = JSON.parse(responseText);
        errorMessage = errorJson.message || errorJson.error || errorMessage;
      }
    } catch (e) {
      // Игнорируем ошибку парсинга, используем стандартное сообщение
    }
    
    if (response.status === 401) {
      throw new AuthError('Неверные учетные данные', response.status);
    }
    
    if (response.status === 403) {
      throw new AuthError('Доступ запрещен', response.status);
    }
    
    if (response.status >= 500) {
      throw new NetworkError('Ошибка сервера. Попробуйте позже');
    }
    
    throw new Error(errorMessage);
  }

  // Если тело ответа пустое, возвращаем пустой объект
  if (!responseText.trim()) {
    return {} as T;
  }
  
  try {
    const jsonResponse = JSON.parse(responseText);
    return jsonResponse as T;
  } catch (e) {
    throw new Error('Сервер вернул некорректный JSON ответ');
  }
}

class ApiClient {
  private getToken(): string | null {
    return localStorage.getItem('token');
  }

  private validateToken(token: string): boolean {
    if (!token || typeof token !== 'string') return false;
    return isValidJWT(token);
  }

  private getAuthHeaders(): Record<string, string> {
    const token = this.getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'ngrok-skip-browser-warning': 'true'
    };

    if (token && this.validateToken(token)) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return headers;
  }

  private validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private validatePassword(password: string): boolean {
    return password && password.length >= 1; // Минимальная валидация
  }
  
  async register(data: RegisterRequest): Promise<RegisterResponse> {
    // Валидация входных данных
    if (!this.validateEmail(data.email)) {
      throw new ValidationError('Некорректный email адрес');
    }
    
    if (!this.validatePassword(data.password)) {
      throw new ValidationError('Пароль должен содержать минимум 1 символ');
    }
    
    if (!data.name || data.name.trim().length < 2) {
      throw new ValidationError('Имя должно содержать минимум 2 символа');
    }

    const response = await makeApiRequest<RegisterResponse>(`${API_BASE_URL}/register-user`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true'
      },
      body: JSON.stringify({
        email: data.email.trim().toLowerCase(),
        password: data.password,
        name: data.name.trim()
      })
    });

    // Валидация ответа
    if (response.success && response.data?.token) {
      if (!this.validateToken(response.data.token)) {
        throw new Error('Сервер вернул недействительный токен');
      }
      
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
    }

    return response;
  }

  async login(data: LoginRequest): Promise<LoginResponse> {
    console.log('[API] Начало попытки входа...');
    
    // Валидация входных данных
    if (!this.validateEmail(data.email)) {
      throw new ValidationError('Некорректный email адрес');
    }
    
    if (!this.validatePassword(data.password)) {
      throw new ValidationError('Пароль не может быть пустым');
    }

    const requestBody = {
      email: data.email.trim().toLowerCase(),
      password: data.password
    };

    console.log('[API] Отправка запроса на сервер...');

    const response = await makeApiRequest<LoginResponse>(`${API_BASE_URL}/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true'
      },
      body: JSON.stringify(requestBody)
    });

    console.log('[API] Получен ответ от сервера:', response);

    // КРИТИЧЕСКАЯ ВАЛИДАЦИЯ ОТВЕТА
    if (!response) {
      throw new Error('Сервер не вернул ответ');
    }

    if (!response.success) {
      const errorMsg = response.error || 'Ошибка аутентификации';
      console.log('[API] Ошибка аутентификации:', errorMsg);
      throw new AuthError(errorMsg, 401);
    }

    if (!response.data) {
      throw new Error('Сервер не вернул данные пользователя');
    }

    const { user, token } = response.data;

    // Валидация пользователя
    if (!user || typeof user !== 'object') {
      throw new Error('Некорректные данные пользователя');
    }

    if (!user.id || !user.email || !user.name || !user.role) {
      throw new Error('Неполные данные пользователя');
    }

    // Валидация токена
    if (!token || !this.validateToken(token)) {
      throw new Error('Сервер вернул недействительный токен');
    }

    // Сохранение данных только после всех проверок
    console.log('[API] Сохранение данных пользователя...');
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));

    console.log('[API] Аутентификация завершена успешно');
    return response;
  }

  async timeAction(data: TimeActionRequest): Promise<any> {
    const token = this.getToken();
    if (!token || !this.validateToken(token)) {
      throw new AuthError('Необходима авторизация', 401);
    }

    return makeApiRequest(`${API_BASE_URL}/time-action`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data)
    });
  }

  async getAllUsers(): Promise<User[]> {
    const token = this.getToken();
    if (!token || !this.validateToken(token)) {
      throw new AuthError('Необходима авторизация', 401);
    }

    console.log('[getAllUsers] Fetching users...');
    
    const result = await makeApiRequest<any>(`${API_BASE_URL}/admin/users`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    });

    if (!result) {
      throw new Error('Сервер не вернул данные');
    }

    // Проверка структуры ответа
    if (!result.data) {
      throw new Error('Сервер вернул некорректные данные (отсутствует поле data)');
    }

    if (!Array.isArray(result.data)) {
      console.error('[getAllUsers] Ошибка: API не вернул массив пользователей. Получено:', result);
      throw new Error('Сервер вернул некорректные данные (ожидался массив в result.data)');
    }

    console.log(`[getAllUsers] Получен массив из ${result.data.length} пользователей.`);

    return result.data.map((user: any) => ({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      status: user.status || 'offline',
      breakStartTime: user.breakStartTime,
    }));
  }

  async updateUser(userId: number, data: { name: string; role: string }): Promise<any> {
    const token = this.getToken();
    if (!token || !this.validateToken(token)) {
      throw new AuthError('Необходима авторизация', 401);
    }

    if (!data.name || data.name.trim().length < 2) {
      throw new ValidationError('Имя должно содержать минимум 2 символа');
    }

    if (!['user', 'admin'].includes(data.role)) {
      throw new ValidationError('Некорректная роль пользователя');
    }

    return makeApiRequest(`${API_BASE_URL}/admin/user/${userId}`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({
        name: data.name.trim(),
        role: data.role
      })
    });
  }

  async deleteUser(userId: number): Promise<any> {
    const token = this.getToken();
    if (!token || !this.validateToken(token)) {
      throw new AuthError('Необходима авторизация', 401);
    }

    if (!userId || userId <= 0) {
      throw new ValidationError('Некорректный ID пользователя');
    }

    return makeApiRequest(`${API_BASE_URL}/admin/user/${userId}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders()
    });
  }

  async getUserLogs(userId: number): Promise<UserLog[]> {
    const token = this.getToken();
    if (!token || !this.validateToken(token)) {
      throw new AuthError('Необходима авторизация', 401);
    }

    return makeApiRequest<UserLog[]>(`${API_BASE_URL}/admin/user/${userId}/logs`, {
      method: 'GET',
      headers: this.getAuthHeaders()
    });
  }
  
  async notifyBreakExceeded(data: { 
    userId: number; 
    userName: string; 
    userEmail: string; 
    breakDurationMinutes: number 
  }) {
    const token = this.getToken();
    if (!token || !this.validateToken(token)) {
      throw new AuthError('Необходима авторизация', 401);
    }

    return makeApiRequest(`${API_BASE_URL}/notify-break-exceeded`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data)
    });
  }

  async reportLateness(data: { 
    userId: number; 
    userName: string; 
    userEmail: string; 
    startTime: string; 
    lateMinutes: number 
  }) {
    const token = this.getToken();
    if (!token || !this.validateToken(token)) {
      throw new AuthError('Необходима авторизация', 401);
    }

    return makeApiRequest(`${API_BASE_URL}/lateness-report`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data)
    });
  }

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('originalAdmin');
    localStorage.removeItem('isAdminMode');
    window.location.href = '/login';
  }

  // Метод для проверки валидности текущего токена
  isTokenValid(): boolean {
    const token = this.getToken();
    return token ? this.validateToken(token) : false;
  }

  // Метод для получения информации из токена
  getTokenPayload(): any {
    const token = this.getToken();
    if (!token || !this.validateToken(token)) return null;

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload;
    } catch {
      return null;
    }
  }
}

export const apiClient = new ApiClient();
