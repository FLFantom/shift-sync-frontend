
import { supabase } from '@/integrations/supabase/client';

export interface User {
  id: number;
  email: string;
  name: string;
  role: 'user' | 'admin';
  status?: 'working' | 'break' | 'offline';
  breakStartTime?: string;
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

export class SupabaseApiClient {
  // Авторизация
  async login(credentials: LoginRequest): Promise<ApiResponse<{ user: User; token: string }>> {
    try {
      // Получаем пользователя из таблицы users
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

      // Простая проверка пароля (в реальном приложении используйте хеширование)
      if (userData.password !== credentials.password) {
        return {
          success: false,
          error: 'Неверный пароль'
        };
      }

      // Создаем токен (в реальном приложении используйте JWT)
      const token = btoa(JSON.stringify({ userId: userData.id, email: userData.email }));

      // Приводим роль к правильному типу
      const user: User = {
        ...userData,
        role: userData.role as 'user' | 'admin'
      };

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

  async register(userData: RegisterRequest): Promise<ApiResponse<{ user: User; token: string }>> {
    try {
      // Проверяем, существует ли пользователь
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

      // Создаем нового пользователя
      const { data: newUser, error } = await supabase
        .from('users')
        .insert([
          {
            email: userData.email.toLowerCase(),
            name: userData.name,
            password: userData.password, // В реальном приложении хешируйте пароль
            role: 'user'
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

      const token = btoa(JSON.stringify({ userId: newUser.id, email: newUser.email }));

      // Приводим роль к правильному типу
      const user: User = {
        ...newUser,
        role: newUser.role as 'user' | 'admin'
      };

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

  // Управление пользователями (для админов)
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

      // Приводим роли к правильному типу
      return (data || []).map(user => ({
        ...user,
        role: user.role as 'user' | 'admin'
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

      // Приводим роль к правильному типу
      const user: User = {
        ...data,
        role: data.role as 'user' | 'admin'
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

  // Управление временем
  async timeAction(userId: number, action: 'start_work' | 'start_break' | 'end_break' | 'end_work', breakDuration?: number): Promise<ApiResponse<TimeLog>> {
    try {
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
            role
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

      // Приводим роли к правильному типу
      return (data || []).map(log => ({
        ...log,
        user: {
          ...log.users,
          role: log.users.role as 'user' | 'admin'
        }
      }));
    } catch (error) {
      console.error('Get all logs error:', error);
      return [];
    }
  }

  // Смена пароля
  async changePassword(userId: number, currentPassword: string, newPassword: string): Promise<ApiResponse<void>> {
    try {
      // Проверяем текущий пароль
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

      // Обновляем пароль
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

  // Сброс пароля (для админов)
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
