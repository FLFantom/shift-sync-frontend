
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
  userId: number;
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

class ApiClient {
  private getAuthHeaders() {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      'ngrok-skip-browser-warning': 'true',
      ...(token && { 'Authorization': `Bearer ${token}` })
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
      const error = await response.text();
      throw new Error(`HTTP error! status: ${response.status}, message: ${error}`);
    }
    
    return response.json();
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

    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.error || 'Login failed');
    }
    
    if (result.success && result.token) {
      // Store token and user data directly from result, not result.data
      localStorage.setItem('token', result.token);
      if (result.user) {
        localStorage.setItem('user', JSON.stringify(result.user));
      }
    }
    
    return result;
  }

  async timeAction(data: TimeActionRequest) {
    const response = await fetch(`${API_BASE_URL}/time-action`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data)
    });

    return this.handleResponse(response);
  }

  async getAllUsers(): Promise<User[]> {
    const response = await fetch(`${API_BASE_URL}/admin/users`, {
      method: 'GET',
      headers: this.getAuthHeaders()
    });

    const result = await this.handleResponse(response);
    return result.success ? result.data : [];
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
    return result.success ? result.data : [];
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
