import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../lib/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  logout: () => void;
  loading: boolean;
  updateUserStatus: (status: 'working' | 'break' | 'offline', breakStartTime?: string) => void;
  loginAsUser: (userId: string) => boolean;
  isAdminMode: boolean;
  returnToAdmin: () => void;
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
        }
      } catch (error) {
        console.error('Error parsing stored user data:', error);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('originalAdmin');
        localStorage.removeItem('isAdminMode');
      }
    }
    setLoading(false);
  }, []);

  const loginAsUser = (userId: string): boolean => {
    try {
      if (!user || user.role !== 'admin') {
        console.error('Только администратор может входить под другими пользователями');
        return false;
      }

      // Сохраняем текущего администратора
      if (!isAdminMode) {
        setOriginalAdmin(user);
        localStorage.setItem('originalAdmin', JSON.stringify(user));
      }

      // Создаем мок-пользователя (в реальном приложении здесь должен быть API запрос)
      const targetUser: User = {
        id: parseInt(userId),
        email: `user${userId}@example.com`,
        name: `User ${userId}`,
        role: 'user',
        status: 'offline'
      };

      // Переключаемся на целевого пользователя
      setUser(targetUser);
      setIsAdminMode(true);
      localStorage.setItem('user', JSON.stringify(targetUser));
      localStorage.setItem('isAdminMode', 'true');

      return true;
    } catch (error) {
      console.error('Ошибка при входе под пользователем:', error);
      return false;
    }
  };

  const returnToAdmin = (): void => {
    if (originalAdmin && isAdminMode) {
      setUser(originalAdmin);
      setIsAdminMode(false);
      setOriginalAdmin(null);
      
      localStorage.setItem('user', JSON.stringify(originalAdmin));
      localStorage.removeItem('originalAdmin');
      localStorage.removeItem('isAdminMode');
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('originalAdmin');
    localStorage.removeItem('isAdminMode');
    setUser(null);
    setToken(null);
    setOriginalAdmin(null);
    setIsAdminMode(false);
    console.log('User logged out, localStorage cleared');
  };

  const updateUserStatus = (status: 'working' | 'break' | 'offline', breakStartTime?: string) => {
    setUser(prevUser => {
      if (!prevUser) return null;
      
      const updatedUser = {
        ...prevUser,
        status
      };
      
      // Логика управления временем перерыва
      if (status === 'break') {
        // Если это новый перерыв и передано время начала
        if (breakStartTime) {
          updatedUser.breakStartTime = breakStartTime;
        }
        // Если пользователь уже был на перерыве и возвращается с паузы,
        // сохраняем старое время начала перерыва
        else if (prevUser.status === 'break' && prevUser.breakStartTime) {
          updatedUser.breakStartTime = prevUser.breakStartTime;
        }
        // Если пользователь переходит в перерыв впервые за день
        else if (prevUser.status !== 'break') {
          // Проверяем, есть ли сохраненное время перерыва за сегодня
          const savedBreakTime = localStorage.getItem(`breakStartTime_${prevUser.id}_${new Date().toDateString()}`);
          if (savedBreakTime) {
            // Если есть сохраненное время за сегодня, используем его
            updatedUser.breakStartTime = savedBreakTime;
          } else {
            // Если нет сохраненного времени, устанавливаем текущее время
            const newBreakTime = new Date().toISOString();
            updatedUser.breakStartTime = newBreakTime;
            // Сохраняем время начала перерыва за сегодня
            localStorage.setItem(`breakStartTime_${prevUser.id}_${new Date().toDateString()}`, newBreakTime);
          }
        }
      } else if (status === 'working') {
        // Когда пользователь возвращается к работе, не удаляем время перерыва
        // Это позволит продолжить отсчет при следующем перерыве
        // Время перерыва будет очищено только в начале нового дня
        if (prevUser.breakStartTime) {
          // Сохраняем время перерыва для возможного продолжения
          localStorage.setItem(`breakStartTime_${prevUser.id}_${new Date().toDateString()}`, prevUser.breakStartTime);
        }
        updatedUser.breakStartTime = prevUser.breakStartTime; // Сохраняем время
      } else {
        // Для статуса 'offline' также сохраняем время перерыва
        updatedUser.breakStartTime = prevUser.breakStartTime;
      }
      
      // Сохраняем обновленного пользователя в localStorage
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
      returnToAdmin
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
