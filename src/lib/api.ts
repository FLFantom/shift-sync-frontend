
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

  private async handleResponse(response: Response) {
    console.log('API Response status:', response.status);
    
    // Handle specific error status codes
    if (!response.ok) {
      switch (response.status) {
        case 401:
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          throw new AuthError('Session expired', 401);
        case 403:
          throw new AuthError('Insufficient permissions', 403);
        case 422:
          const errorData = await response.json().catch(() => ({}));
          throw new ValidationError(errorData.error || 'Validation failed', 422);
        case 500:
          throw new Error('Server error occurred');
        default:
          const error = await response.text().catch(() => 'Unknown error');
          throw new Error(`HTTP error! status: ${response.status}, message: ${error}`);
      }
    }
    
    // Parse response text
    const text = await response.text();
    console.log('Raw response:', text);
    
    if (!text) {
      return { success: true };
    }
    
    try {
      const jsonData = JSON.parse(text);
      console.log('Parsed response:', jsonData);
      
      // Handle error responses
      if (jsonData.success === false) {
        throw new Error(jsonData.error || 'Request failed');
      }
      
      return jsonData;
    } catch (parseError) {
      if (parseError instanceof Error && parseError.message !== 'Request failed') {
        console.error('Failed to parse JSON:', text);
        throw new Error('Invalid JSON response');
      }
      throw parseError;
    }
  }

  async register(data: RegisterRequest): Promise<RegisterResponse> {
    console.log('Register request:', data);
    
    const response = await fetch(`${API_BASE_URL}/register-user`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true'
      },
      body: JSON.stringify(data)
    });

    const result = await this.handleResponse(response);
    
    // Handle both direct and wrapped responses
    if (result.success && result.data) {
      // Wrapped format: {success: true, data: {user, token, message}}
      return {
        success: true,
        data: result.data
      };
    } else if (result.success && result.user && result.token) {
      // Direct format: {success: true, user, token, message}
      return {
        success: true,
        data: {
          message: result.message || 'Registration successful',
          user: result.user,
          token: result.token
        }
      };
    }
    
    throw new Error('Invalid registration response format');
  }

  async login(data: LoginRequest): Promise<LoginResponse> {
    console.log('Login request:', data);
    
    const response = await fetch(`${API_BASE_URL}/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true'
      },
      body: JSON.stringify(data)
    });

    const result = await this.handleResponse(response);
    
    // Handle wrapped response format: {success: true, data: {user, token, message}}
    if (result.success && result.data) {
      // Store token and user data
      localStorage.setItem('token', result.data.token);
      localStorage.setItem('user', JSON.stringify(result.data.user));
      
      return {
        success: true,
        data: result.data
      };
    }
    
    throw new Error('Invalid login response format');
  }

  async timeAction(data: TimeActionRequest) {
    console.log('Sending time action request:', data);
    
    const requestBody: any = {
      action: data.action
    };
    
    // Add break_duration for break-related actions
    if (data.break_duration !== undefined && (data.action === 'end_break' || data.action === 'start_break')) {
      requestBody.break_duration = data.break_duration;
    }
    
    const response = await fetch(`${API_BASE_URL}/time-action`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(requestBody)
    });

    const result = await this.handleResponse(response);
    
    // Handle wrapped response format
    if (result.success && result.data) {
      return result.data;
    }
    
    return result;
  }

  async getAllUsers(): Promise<User[]> {
    const response = await fetch(`${API_BASE_URL}/admin/users`, {
      method: 'GET',
      headers: this.getAuthHeaders()
    });

    const result = await this.handleResponse(response);
    
    // Handle both wrapped and direct formats
    if (result.success && result.data) {
      return Array.isArray(result.data) ? result.data : [];
    } else if (Array.isArray(result)) {
      return result;
    }
    
    return [];
  }

  async updateUser(userId: number, data: { name: string; role: string }) {
    const response = await fetch(`${API_BASE_URL}/admin/user/${userId}`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data)
    });

    const result = await this.handleResponse(response);
    
    if (result.success && result.data) {
      return result.data;
    }
    
    return result;
  }

  async deleteUser(userId: number) {
    const response = await fetch(`${API_BASE_URL}/admin/user/${userId}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders()
    });

    const result = await this.handleResponse(response);
    
    if (result.success && result.data) {
      return result.data;
    }
    
    return result;
  }

  async getUserLogs(userId: number): Promise<UserLog[]> {
    const response = await fetch(`${API_BASE_URL}/admin/user/${userId}/logs`, {
      method: 'GET',
      headers: this.getAuthHeaders()
    });

    const result = await this.handleResponse(response);
    
    // Handle both wrapped and direct formats
    if (result.success && result.data) {
      return Array.isArray(result.data) ? result.data : [];
    } else if (Array.isArray(result)) {
      return result;
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
