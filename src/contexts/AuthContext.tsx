// Полный исправленный AuthContext.tsx
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

  const loginAsUser = async (userId: string): Promise<boolean> => {
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

      // TODO: Заменить на реальный API запрос
      // Сейчас используем заглушку, но нужно получать данные из API
      const response = await fetch(`/webhook/admin/user/${userId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      let targetUser: User;
      
      if (response.ok) {
        const userData = await response.json();
        targetUser = {
          id: userData.id,
          email: userData.email,
          name: userData.name,
          role: userData.role,
          status: userData.status || 'offline'
        };
      } else {
        // Заглушка если API недоступен
        targetUser = {
          id: parseInt(userId),
          email: `user${userId}@example.com`,
          name: `Пользователь ${userId}`,
          role: 'user',
          status: 'offline'
        };
      }

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

  // Остальные функции без изменений...
  const updateUserStatus = (status: 'working' | 'break' | 'offline', breakStartTime?: string) => {
    // Ваш существующий код для updateUserStatus
  };

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
