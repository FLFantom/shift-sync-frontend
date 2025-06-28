
const API_BASE_URL = 'https://gelding-able-sailfish.ngrok-free.app/webhook';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: {
    id: string;
    name: string;
    email: string;
    role: 'user' | 'admin';
  };
  token: string;
}

export interface TimeActionRequest {
  action: 'start_work' | 'start_break' | 'end_break' | 'end_work';
  userId: number;
  breakDuration?: number;
}

export interface LatenessReportRequest {
  userId: string;
  userName: string;
  userEmail: string;
  startTime: string;
  lateMinutes: number;
}

export interface BreakExceededRequest {
  userId: string;
  userName: string;
  userEmail: string;
  breakDurationMinutes: number;
}

export interface UpdateUserRequest {
  name: string;
  role: 'user' | 'admin';
}

export interface ApiUser {
  id: string;
  name: string;
  email: string;
  role: 'user' | 'admin';
  status: 'working' | 'break' | 'offline';
  breakStartTime?: string;
}

export interface UserLog {
  id: string;
  action: string;
  timestamp: string;
  details?: string;
}

class ApiClient {
  private getAuthHeaders() {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      'ngrok-skip-browser-warning': 'true',
      ...(token && { 'Authorization': `Bearer ${token}` })
    };
  }

  private getBasicHeaders() {
    return {
      'Content-Type': 'application/json',
      'ngrok-skip-browser-warning': 'true'
    };
  }

  private async handleResponse(response: Response) {
    if (response.status === 401) {
      // Токен истек или невалидный
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
      throw new Error('Unauthorized');
    }
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return response;
  }

  async login(data: LoginRequest): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/login`, {
      method: 'POST',
      headers: this.getBasicHeaders(),
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      throw new Error('Login failed');
    }

    const result = await response.json();
    console.log('Raw API response:', result);
    
    // Возвращаем весь ответ, чтобы Login.tsx мог правильно его обработать
    return result;
  }

  async timeAction(data: TimeActionRequest): Promise<void> {
    console.log('Sending time action with data:', data);
    const response = await fetch(`${API_BASE_URL}/time-action`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data)
    });

    await this.handleResponse(response);
  }

  async reportLateness(data: LatenessReportRequest): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/lateness-report`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data)
    });

    await this.handleResponse(response);
  }

  async notifyBreakExceeded(data: BreakExceededRequest): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/notify-break-exceeded`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data)
    });

    await this.handleResponse(response);
  }

  async getAllUsers(): Promise<ApiUser[]> {
    const response = await fetch(`${API_BASE_URL}/admin/users`, {
      method: 'GET',
      headers: this.getAuthHeaders()
    });

    const handledResponse = await this.handleResponse(response);
    return handledResponse.json();
  }

  async updateUser(userId: string, data: UpdateUserRequest): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/admin/user/${userId}`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data)
    });

    await this.handleResponse(response);
  }

  async deleteUser(userId: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/admin/user/${userId}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders()
    });

    await this.handleResponse(response);
  }

  async getUserLogs(userId: string): Promise<UserLog[]> {
    const response = await fetch(`${API_BASE_URL}/admin/user/${userId}/logs`, {
      method: 'GET',
      headers: this.getAuthHeaders()
    });

    const handledResponse = await this.handleResponse(response);
    return handledResponse.json();
  }
}

export const apiClient = new ApiClient();
