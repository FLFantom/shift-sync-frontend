
import React, { createContext, useContext, useState, useEffect } from 'react';

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
  token: string | null;
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  logout: () => void;
  loading: boolean;
  updateUserStatus: (status: 'working' | 'break' | 'offline', breakStartTime?: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    
    if (storedToken && userData) {
      try {
        setToken(storedToken);
        setUser(JSON.parse(userData));
      } catch (error) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
    setLoading(false);
  }, []);

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setToken(null);
  };

  const updateUserStatus = (status: 'working' | 'break' | 'offline', breakStartTime?: string) => {
    if (user) {
      let newBreakStartTime;
      
      if (status === 'break') {
        if (user.breakStartTime) {
          const existingBreakDate = new Date(user.breakStartTime);
          const currentDate = new Date();
          
          const isSameDay = existingBreakDate.getFullYear() === currentDate.getFullYear() &&
                           existingBreakDate.getMonth() === currentDate.getMonth() &&
                           existingBreakDate.getDate() === currentDate.getDate();
          
          if (isSameDay) {
            newBreakStartTime = user.breakStartTime;
          } else {
            newBreakStartTime = breakStartTime || new Date().toISOString();
          }
        } else {
          newBreakStartTime = breakStartTime || new Date().toISOString();
        }
      }
      
      const updatedUser = { 
        ...user, 
        status, 
        breakStartTime: status === 'break' ? newBreakStartTime : user.breakStartTime
      };
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
    }
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
      updateUserStatus
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
