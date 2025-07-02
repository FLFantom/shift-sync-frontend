import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../lib/supabaseApi';
import { supabaseApiClient } from '../lib/supabaseApi';

interface AuthContextType {
  user: User | null;
  token: string | null;
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  logout: () => void;
  loading: boolean;
  updateUserStatus: (status: 'working' | 'break' | 'offline', breakStartTime?: string) => void;
  loginAsUser: (userId: string) => Promise<boolean>;
  isAdminMode: boolean;
  returnToAdmin: () => void;
  originalAdmin: User | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [originalAdmin, setOriginalAdmin] = useState<User | null>(null);
  const [isAdminMode, setIsAdminMode] = useState(false);

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    const savedOriginalAdmin = localStorage.getItem('originalAdmin');
    const savedAdminMode = localStorage.getItem('isAdminMode');
    
    if (storedToken && userData) {
      try {
        const parsedUser = JSON.parse(userData);
        setToken(storedToken);
        setUser(parsedUser);
        
        // Восстанавливаем режим администратора
        if (savedOriginalAdmin && savedAdminMode === 'true') {
          const originalAdminData = JSON.parse(savedOriginalAdmin);
          setOriginalAdmin(originalAdminData);
          setIsAdminMode(true);
          console.log('Восстановлен режим администратора:', originalAdminData.name);
        }
      } catch (error) {
        console.error('Error parsing stored user data:', error);
        // Очищаем поврежденные данные
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('originalAdmin');
        localStorage.removeItem('isAdminMode');
      }
    }
    setLoading(false);
  }, []);

  const loginAsUser = async (userId: string): Promise<boolean> => {
    try {
      console.log(`[AuthContext] Попытка входа под пользователем ID: ${userId}`);
      
      if (!user || user.role !== 'admin') {
        console.error('Только администратор может входить под другими пользователями');
        return false;
      }

      // Сохраняем текущего администратора
      if (!isAdminMode) {
        console.log('Сохранение данных администратора:', user.name);
        setOriginalAdmin(user);
        localStorage.setItem('originalAdmin', JSON.stringify(user));
      }

      let targetUser: User;

      try {
        // Получаем реальные данные пользователя из Supabase
        console.log('Получение данных пользователя из Supabase...');
        const allUsers = await supabaseApiClient.getAllUsers();
        const foundUser = allUsers.find(u => u.id.toString() === userId);
        
        if (foundUser) {
          targetUser = foundUser;
          console.log('Найден пользователь в Supabase:', foundUser.name);
        } else {
          throw new Error('Пользователь не найден в Supabase');
        }
      } catch (apiError) {
        console.warn('Не удалось получить данные из Supabase:', apiError);
        return false;
      }

      // Переключаемся на целевого пользователя
      console.log('Переключение на пользователя:', targetUser.name);
      setUser(targetUser);
      setIsAdminMode(true);
      localStorage.setItem('user', JSON.stringify(targetUser));
      localStorage.setItem('isAdminMode', 'true');

      console.log('[AuthContext] Успешный вход под пользователем:', targetUser.name);
      return true;
      
    } catch (error) {
      console.error('Ошибка при входе под пользователем:', error);
      return false;
    }
  };

  const returnToAdmin = (): void => {
    if (originalAdmin && isAdminMode) {
      console.log('Возврат к администратору:', originalAdmin.name);
      
      setUser(originalAdmin);
      setIsAdminMode(false);
      setOriginalAdmin(null);
      
      localStorage.setItem('user', JSON.stringify(originalAdmin));
      localStorage.removeItem('originalAdmin');
      localStorage.removeItem('isAdminMode');
      
      console.log('[AuthContext] Успешный возврат к администратору');
    } else {
      console.warn('Невозможно вернуться к администратору: нет сохраненных данных');
    }
  };

  const logout = () => {
    console.log('Выход из системы...');
    
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('originalAdmin');
    localStorage.removeItem('isAdminMode');
    
    // Очищаем данные времени перерывов
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith('breakStartTime_')) {
        localStorage.removeItem(key);
      }
    });
    
    setUser(null);
    setToken(null);
    setOriginalAdmin(null);
    setIsAdminMode(false);
    
    console.log('User logged out, localStorage cleared');
  };

  const updateUserStatus = (status: 'working' | 'break' | 'offline', breakStartTime?: string) => {
    setUser(prevUser => {
      if (!prevUser) return null;
      
      console.log(`Обновление статуса пользователя ${prevUser.name}: ${prevUser.status} -> ${status}`);
      
      const updatedUser = {
        ...prevUser,
        status
      };
      
      // Логика управления временем перерыва
      if (status === 'break') {
        if (breakStartTime) {
          updatedUser.breakStartTime = breakStartTime;
          console.log('Установлено новое время начала перерыва:', breakStartTime);
        } else if (prevUser.status === 'break' && prevUser.breakStartTime) {
          updatedUser.breakStartTime = prevUser.breakStartTime;
          console.log('Продолжение существующего перерыва');
        } else if (prevUser.status !== 'break') {
          const savedBreakTime = localStorage.getItem(`breakStartTime_${prevUser.id}_${new Date().toDateString()}`);
          if (savedBreakTime) {
            updatedUser.breakStartTime = savedBreakTime;
            console.log('Восстановлено время перерыва за сегодня:', savedBreakTime);
          } else {
            const newBreakTime = new Date().toISOString();
            updatedUser.breakStartTime = newBreakTime;
            localStorage.setItem(`breakStartTime_${prevUser.id}_${new Date().toDateString()}`, newBreakTime);
            console.log('Установлено новое время начала перерыва:', newBreakTime);
          }
        }
      } else if (status === 'working') {
        if (prevUser.breakStartTime) {
          localStorage.setItem(`breakStartTime_${prevUser.id}_${new Date().toDateString()}`, prevUser.breakStartTime);
        }
        updatedUser.breakStartTime = prevUser.breakStartTime;
        console.log('Возврат к работе, время перерыва сохранено');
      } else {
        updatedUser.breakStartTime = prevUser.breakStartTime;
        console.log('Переход в оффлайн, время перерыва сохранено');
      }
      
      localStorage.setItem('user', JSON.stringify(updatedUser));
      return updatedUser;
    });
  };

  // Очистка времени перерыва в начале нового дня
  useEffect(() => {
    const checkNewDay = () => {
      const today = new Date().toDateString();
      const lastCheck = localStorage.getItem('lastDayCheck');
      
      if (lastCheck !== today) {
        console.log('Обнаружен новый день, очистка данных перерывов...');
        
        // Новый день - очищаем все сохраненные времена перерывов
        const keys = Object.keys(localStorage);
        keys.forEach(key => {
          if (key.startsWith('breakStartTime_')) {
            localStorage.removeItem(key);
          }
        });
        
        // Обновляем пользователя, очищая время перерыва
        setUser(prevUser => {
          if (prevUser && prevUser.breakStartTime) {
            const updatedUser = {
              ...prevUser,
              breakStartTime: undefined,
              status: 'offline' as const
            };
            localStorage.setItem('user', JSON.stringify(updatedUser));
            console.log('Очищено время перерыва для нового дня');
            return updatedUser;
          }
          return prevUser;
        });
        
        localStorage.setItem('lastDayCheck', today);
      }
    };

    // Проверяем при загрузке
    checkNewDay();
    
    // Проверяем каждую минуту
    const interval = setInterval(checkNewDay, 60000);
    
    return () => clearInterval(interval);
  }, []);

  const handleSetUser = (newUser: User | null) => {
    setUser(newUser);
    if (newUser) {
      localStorage.setItem('user', JSON.stringify(newUser));
    } else {
      localStorage.removeItem('user');
    }
  };

  const handleSetToken = (newToken: string | null) => {
    setToken(newToken);
    if (newToken) {
      localStorage.setItem('token', newToken);
    } else {
      localStorage.removeItem('token');
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      token,
      setUser: handleSetUser,
      setToken: handleSetToken,
      logout, 
      loading, 
      updateUserStatus,
      loginAsUser,
      isAdminMode,
      returnToAdmin,
      originalAdmin
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
