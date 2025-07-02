
import { supabase } from '@/integrations/supabase/client';
import { sign, verify } from 'jsonwebtoken';

export interface User {
  id: number;
  email: string;
  name: string;
  role: 'user' | 'admin';
  status?: 'working' | 'break' | 'offline';
  breakStartTime?: string;
  break_start_time?: string;
  created_at?: string;
  updated_at?: string;
}

export interface TimeLog {
  id: number;
  user_id: number;
  action: string;
  timestamp: string;
  break_duration?: number;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// JWT Secret (в реальном приложении должен быть в переменных окружения)
const JWT_SECRET = '23GP3dGQZyyHLQSOwJ9CEOTJ7YpMTrChbnwztDRI';

// Функция для безопасного приведения статуса к нужному типу
const normalizeStatus = (status: string | null): 'working' | 'break' | 'offline' => {
  if (status === 'working' || status === 'break' || status === 'offline') {
    return status;
  }
  return 'offline';
};

export class SupabaseApiClient {
  // Генерация JWT токена
  private generateJWT(user: User): string {
    const payload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 часа
    };
    return sign(payload, JWT_SECRET);
  }

  // Проверка JWT токена
  private verifyJWT(token: string): any {
    try {
      return verify(token, JWT_SECRET);
    } catch (error) {
      return null;
    }
  }

  // Авторизация с JWT
  async login(credentials: LoginRequest): Promise<ApiResponse<{ user: User; token: string }>> {
    try {
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('email', credentials.email.toLowerCase())
        .single();

      if (userError || !userData) {
        return {
          success: false,
          error: 'Пользователь не найден'
        };
      }

      if (userData.password !== credentials.password) {
        return {
          success: false,
          error: 'Неверный пароль'
        };
      }

      const user: User = {
        ...userData,
        role: userData.role as 'user' | 'admin',
        status: normalizeStatus(userData.status),
        breakStartTime: userData.break_start_time
      };

      // Генерируем JWT токен
      const token = this.generateJWT(user);

      return {
        success: true,
        data: {
          user,
          token
        }
      };
    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        error: 'Ошибка входа в систему'
      };
    }
  }

  // Обновление статуса пользователя
  async updateUserStatus(userId: number, status: 'working' | 'break' | 'offline', breakStartTime?: string): Promise<ApiResponse<void>> {
    try {
      const updateData: any = { 
        status: status,
        updated_at: new Date().toISOString()
      };

      if (status === 'break' && breakStartTime) {
        updateData.break_start_time = breakStartTime;
      } else if (status !== 'break') {
        updateData.break_start_time = null;
      }

      const { error } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', userId);

      if (error) {
        return {
          success: false,
          error: 'Ошибка обновления статуса'
        };
      }

      return {
        success: true
      };
    } catch (error) {
      console.error('Update status error:', error);
      return {
        success: false,
        error: 'Ошибка обновления статуса'
      };
    }
  }

  async register(userData: RegisterRequest): Promise<ApiResponse<{ user: User; token: string }>> {
    try {
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('email', userData.email.toLowerCase())
        .single();

      if (existingUser) {
        return {
          success: false,
          error: 'Пользователь с таким email уже существует'
        };
      }

      const { data: newUser, error } = await supabase
        .from('users')
        .insert([
          {
            email: userData.email.toLowerCase(),
            name: userData.name,
            password: userData.password,
            role: 'user',
            status: 'offline'
          }
        ])
        .select()
        .single();

      if (error || !newUser) {
        return {
          success: false,
          error: 'Ошибка создания пользователя'
        };
      }

      const user: User = {
        ...newUser,
        role: newUser.role as 'user' | 'admin',
        status: normalizeStatus(newUser.status)
      };

      const token = this.generateJWT(user);

      return {
        success: true,
        data: {
          user,
          token
        }
      };
    } catch (error) {
      console.error('Register error:', error);
      return {
        success: false,
        error: 'Ошибка регистрации'
      };
    }
  }

  async getAllUsers(): Promise<User[]> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Get users error:', error);
        return [];
      }

      return (data || []).map(user => ({
        ...user,
        role: user.role as 'user' | 'admin',
        status: normalizeStatus(user.status)
      }));
    } catch (error) {
      console.error('Get users error:', error);
      return [];
    }
  }

  async updateUser(userId: number, updates: { name: string; role: string }): Promise<ApiResponse<User>> {
    try {
      const { data, error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', userId)
        .select()
        .single();

      if (error) {
        return {
          success: false,
          error: 'Ошибка обновления пользователя'
        };
      }

      const user: User = {
        ...data,
        role: data.role as 'user' | 'admin',
        status: normalizeStatus(data.status)
      };

      return {
        success: true,
        data: user
      };
    } catch (error) {
      console.error('Update user error:', error);
      return {
        success: false,
        error: 'Ошибка обновления пользователя'
      };
    }
  }

  async deleteUser(userId: number): Promise<ApiResponse<void>> {
    try {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', userId);

      if (error) {
        return {
          success: false,
          error: 'Ошибка удаления пользователя'
        };
      }

      return {
        success: true
      };
    } catch (error) {
      console.error('Delete user error:', error);
      return {
        success: false,
        error: 'Ошибка удаления пользователя'
      };
    }
  }

  async timeAction(userId: number, action: 'start_work' | 'start_break' | 'end_break' | 'end_work', breakDuration?: number): Promise<ApiResponse<TimeLog>> {
    try {
      // Обновляем статус пользователя в базе данных
      let newStatus: 'working' | 'break' | 'offline' = 'offline';
      let breakStartTime: string | undefined;

      if (action === 'start_work') newStatus = 'working';
      else if (action === 'start_break') {
        newStatus = 'break';
        breakStartTime = new Date().toISOString();
      }
      else if (action === 'end_break') newStatus = 'working';
      else if (action === 'end_work') newStatus = 'offline';

      await this.updateUserStatus(userId, newStatus, breakStartTime);

      const { data, error } = await supabase
        .from('time_logs')
        .insert([
          {
            user_id: userId,
            action,
            break_duration: breakDuration || null,
            timestamp: new Date().toISOString()
          }
        ])
        .select()
        .single();

      if (error) {
        return {
          success: false,
          error: 'Ошибка записи действия'
        };
      }

      return {
        success: true,
        data
      };
    } catch (error) {
      console.error('Time action error:', error);
      return {
        success: false,
        error: 'Ошибка записи действия'
      };
    }
  }

  async getUserLogs(userId: number, startDate?: string, endDate?: string): Promise<TimeLog[]> {
    try {
      let query = supabase
        .from('time_logs')
        .select('*')
        .eq('user_id', userId);

      if (startDate) {
        query = query.gte('timestamp', startDate);
      }

      if (endDate) {
        query = query.lte('timestamp', endDate);
      }

      const { data, error } = await query.order('timestamp', { ascending: false });

      if (error) {
        console.error('Get user logs error:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Get user logs error:', error);
      return [];
    }
  }

  async getAllLogs(startDate?: string, endDate?: string): Promise<(TimeLog & { user: User })[]> {
    try {
      let query = supabase
        .from('time_logs')
        .select(`
          *,
          users (
            id,
            name,
            email,
            role,
            status
          )
        `);

      if (startDate) {
        query = query.gte('timestamp', startDate);
      }

      if (endDate) {
        query = query.lte('timestamp', endDate);
      }

      const { data, error } = await query.order('timestamp', { ascending: false });

      if (error) {
        console.error('Get all logs error:', error);
        return [];
      }

      return (data || []).map(log => ({
        ...log,
        user: {
          ...log.users,
          role: log.users.role as 'user' | 'admin',
          status: normalizeStatus(log.users.status)
        }
      }));
    } catch (error) {
      console.error('Get all logs error:', error);
      return [];
    }
  }

  async changePassword(userId: number, currentPassword: string, newPassword: string): Promise<ApiResponse<void>> {
    try {
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('password')
        .eq('id', userId)
        .single();

      if (userError || !user) {
        return {
          success: false,
          error: 'Пользователь не найден'
        };
      }

      if (user.password !== currentPassword) {
        return {
          success: false,
          error: 'Неверный текущий пароль'
        };
      }

      const { error } = await supabase
        .from('users')
        .update({ password: newPassword })
        .eq('id', userId);

      if (error) {
        return {
          success: false,
          error: 'Ошибка обновления пароля'
        };
      }

      return {
        success: true
      };
    } catch (error) {
      console.error('Change password error:', error);
      return {
        success: false,
        error: 'Ошибка смены пароля'
      };
    }
  }

  async resetPassword(userId: number, newPassword: string): Promise<ApiResponse<void>> {
    try {
      const { error } = await supabase
        .from('users')
        .update({ password: newPassword })
        .eq('id', userId);

      if (error) {
        return {
          success: false,
          error: 'Ошибка сброса пароля'
        };
      }

      return {
        success: true
      };
    } catch (error) {
      console.error('Reset password error:', error);
      return {
        success: false,
        error: 'Ошибка сброса пароля'
      };
    }
  }
}

export const supabaseApiClient = new SupabaseApiClient();
