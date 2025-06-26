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
  loginAsUser: (userId: string) => boolean;
  getAllUsers: () => User[];
  updateUser: (userId: string, userData: Partial<User>) => boolean;
  deleteUser: (userId: string) => boolean;
  addUser: (userData: Omit<User, 'id' | 'status'>) => boolean;
  isAdminMode: boolean;
  returnToAdmin: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Mock data for demo purposes
let mockUsers: User[] = [
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
  },
  {
    id: '4',
    name: 'Александр Иванов',
    email: 'alex@company.com', 
    role: 'user',
    status: 'break',
    breakStartTime: new Date(Date.now() - 2700000).toISOString()
  },
  {
    id: '5',
    name: 'Елена Смирнова',
    email: 'elena@company.com',
    role: 'user',
    status: 'break',
    breakStartTime: new Date(Date.now() - 4500000).toISOString()
  }
];

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdminMode, setIsAdminMode] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    const originalAdmin = localStorage.getItem('originalAdmin');
    
    if (token && userData) {
      try {
        setUser(JSON.parse(userData));
        setIsAdminMode(!!originalAdmin);
      } catch (error) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('originalAdmin');
      }
    }
    setLoading(false);
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
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
    localStorage.removeItem('originalAdmin');
    setUser(null);
    setIsAdminMode(false);
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
      
      // Update in mockUsers array
      const userIndex = mockUsers.findIndex(u => u.id === user.id);
      if (userIndex !== -1) {
        mockUsers[userIndex] = updatedUser;
      }
    }
  };

  const loginAsUser = (userId: string): boolean => {
    if (user?.role !== 'admin') return false;
    
    const targetUser = mockUsers.find(u => u.id === userId);
    if (targetUser) {
      const token = 'mock-jwt-token';
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(targetUser));
      localStorage.setItem('originalAdmin', JSON.stringify(user));
      setUser(targetUser);
      setIsAdminMode(true);
      return true;
    }
    return false;
  };

  const returnToAdmin = () => {
    const originalAdmin = localStorage.getItem('originalAdmin');
    if (originalAdmin) {
      try {
        const adminUser = JSON.parse(originalAdmin);
        localStorage.setItem('user', JSON.stringify(adminUser));
        localStorage.removeItem('originalAdmin');
        setUser(adminUser);
        setIsAdminMode(false);
        toast({
          title: "Возврат в админ-панель",
          description: "Вы вернулись в режим администратора",
        });
      } catch (error) {
        console.error('Error returning to admin:', error);
      }
    }
  };

  const getAllUsers = (): User[] => {
    return mockUsers;
  };

  const updateUser = (userId: string, userData: Partial<User>): boolean => {
    const userIndex = mockUsers.findIndex(u => u.id === userId);
    if (userIndex !== -1) {
      mockUsers[userIndex] = { ...mockUsers[userIndex], ...userData };
      return true;
    }
    return false;
  };

  const deleteUser = (userId: string): boolean => {
    const userIndex = mockUsers.findIndex(u => u.id === userId);
    if (userIndex !== -1) {
      mockUsers.splice(userIndex, 1);
      return true;
    }
    return false;
  };

  const addUser = (userData: Omit<User, 'id' | 'status'>): boolean => {
    const newUser: User = {
      ...userData,
      id: Date.now().toString(),
      status: 'offline'
    };
    mockUsers.push(newUser);
    return true;
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      login, 
      logout, 
      loading, 
      updateUserStatus,
      loginAsUser,
      getAllUsers,
      updateUser,
      deleteUser,
      addUser,
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
