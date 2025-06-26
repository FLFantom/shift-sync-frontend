
import React, { createContext, useContext, useState, useEffect } from 'react';
import { toast } from '@/hooks/use-toast';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'user' | 'admin';
  status: 'working' | 'break' | 'offline';
  breakStartTime?: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  loading: boolean;
  updateUserStatus: (status: 'working' | 'break' | 'offline', breakStartTime?: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Mock data for demo purposes
const mockUsers: User[] = [
  {
    id: '1',
    name: 'Иван Петров',
    email: 'ivan@company.com',
    role: 'user',
    status: 'offline'
  },
  {
    id: '2', 
    name: 'Мария Сидорова',
    email: 'maria@company.com',
    role: 'user',
    status: 'working'
  },
  {
    id: '3',
    name: 'Админ',
    email: 'admin@company.com',
    role: 'admin',
    status: 'offline'
  }
];

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    
    if (token && userData) {
      try {
        setUser(JSON.parse(userData));
      } catch (error) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
    setLoading(false);
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      // Mock authentication - in real app this would be an API call
      const foundUser = mockUsers.find(u => u.email === email);
      
      if (foundUser && password === '123456') {
        const token = 'mock-jwt-token';
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(foundUser));
        setUser(foundUser);
        
        toast({
          title: "Добро пожаловать!",
          description: `Вы вошли как ${foundUser.name}`,
        });
        
        return true;
      } else {
        toast({
          title: "Ошибка входа",
          description: "Неверный email или пароль",
          variant: "destructive",
        });
        return false;
      }
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Произошла ошибка при входе",
        variant: "destructive",
      });
      return false;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  const updateUserStatus = (status: 'working' | 'break' | 'offline', breakStartTime?: string) => {
    if (user) {
      const updatedUser = { 
        ...user, 
        status, 
        breakStartTime: status === 'break' ? breakStartTime || new Date().toISOString() : undefined 
      };
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, updateUserStatus }}>
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
