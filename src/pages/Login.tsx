import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { apiClient } from '../lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, Mail, Lock, Smartphone, AlertCircle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isMobile, setIsMobile] = useState(false);
  const { setUser, setToken, user } = useAuth();
  const navigate = useNavigate();

  // Проверяем, авторизован ли пользователь
  useEffect(() => {
    if (user && !loading) {
      // Перенаправляем уже авторизованного пользователя
      if (user.role === 'admin') {
        navigate('/admin-panel');
      } else {
        navigate('/dashboard');
      }
    }
  }, [user, navigate, loading]);

  useEffect(() => {
    const checkMobile = () => {
      const userAgent = navigator.userAgent || navigator.vendor || (window as Window & { opera?: string }).opera;
      const mobileRegex = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i;
      const isMobileDevice = mobileRegex.test(userAgent.toLowerCase()) || window.innerWidth <= 768;
      setIsMobile(isMobileDevice);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const validateInput = () => {
    if (!email.trim()) {
      setError('Email обязателен для заполнения');
      return false;
    }

    if (!password) {
      setError('Пароль обязателен для заполнения');
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError('Введите корректный email адрес');
      return false;
    }

    if (password.length < 3) {
      setError('Пароль должен содержать минимум 3 символа');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Валидация на клиенте
    if (!validateInput()) {
      return;
    }

    setLoading(true);
    
    try {
      console.log('Attempting login with:', { email: email.trim() });
      
      const response = await apiClient.login({ 
        email: email.trim().toLowerCase(), 
        password: password 
      });

      console.log('Login response:', response);

      // КРИТИЧЕСКИ ВАЖНАЯ ПРОВЕРКА ОТВЕТА СЕРВЕРА
      if (!response) {
        throw new Error('Нет ответа от сервера');
      }

      if (!response.success) {
        throw new Error(response.error || 'Ошибка аутентификации');
      }

      if (!response.data) {
        throw new Error('Сервер не вернул данные пользователя');
      }

      const { user: userData, token } = response.data;

      // Проверяем обязательные поля пользователя
      if (!userData || !userData.id || !userData.email || !userData.name || !userData.role) {
        throw new Error('Некорректные данные пользователя от сервера');
      }

      if (!token) {
        throw new Error('Сервер не вернул токен авторизации');
      }

      // ВСЁ ПРОВЕРИЛИ - ТЕПЕРЬ СОХРАНЯЕМ
      console.log('Login successful, user data:', userData);
      
      setUser(userData);
      setToken(token);
      
      // Очищаем форму
      setEmail('');
      setPassword('');
      
      // Показываем успешное уведомление
      toast({
        title: "Успешный вход",
        description: `Добро пожаловать, ${userData.name}!`,
      });

      // Перенаправляем в зависимости от роли
      if (userData.role === 'admin') {
        navigate('/admin-panel');
      } else {
        navigate('/dashboard');
      }

    } catch (error: unknown) {
      console.error('Login error:', error);
      
      let errorMessage = 'Произошла ошибка при входе в систему';

      if ((error as { name?: string }).name === 'AuthError') {
        // Ошибки 401/403 - неверные учетные данные
        errorMessage = 'Неверный email или пароль';
      } else if ((error as Error).message) {
        // Другие известные ошибки
        const message = (error as Error).message;
        if (message.includes('Failed to fetch') || message.includes('NetworkError')) {
          errorMessage = 'Ошибка соединения с сервером. Проверьте интернет-подключение.';
        } else if (message.includes('timeout')) {
          errorMessage = 'Превышено время ожидания. Попробуйте позже.';
        } else {
          errorMessage = message;
        }
      }

      setError(errorMessage);
      
      toast({
        title: "Ошибка входа",
        description: errorMessage,
        variant: "destructive",
      });

      // Очищаем пароль при ошибке
      setPassword('');
    } finally {
      setLoading(false);
    }
  };

  if (isMobile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-600 via-orange-600 to-red-800 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/20"></div>
        
        <Card className="w-full max-w-md relative z-10 backdrop-blur-sm bg-white/95 shadow-2xl border-0">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-gradient-to-r from-red-500 to-orange-600 rounded-full flex items-center justify-center">
              <Smartphone className="w-8 h-8 text-white" />
            </div>
            <CardTitle className="text-2xl font-bold bg-gradient-to-r from-red-600 to-orange-600 bg-clip-text text-transparent">
              Доступ ограничен
            </CardTitle>
            <CardDescription className="text-gray-600">
              Вход с мобильных устройств запрещен
            </CardDescription>
          </CardHeader>
          
          <CardContent className="text-center space-y-4">
            <div className="p-4 bg-red-50 rounded-lg border border-red-200">
              <p className="text-red-800 font-medium mb-2">
                Система учета времени недоступна на мобильных устройствах
              </p>
              <p className="text-red-600 text-sm">
                Пожалуйста, используйте компьютер или ноутбук для входа в систему
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-800 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/20"></div>
      
      <Card className="w-full max-w-md relative z-10 backdrop-blur-sm bg-white/95 shadow-2xl border-0">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
            <Clock className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            Система учета времени
          </CardTitle>
          <CardDescription className="text-gray-600">
            Войдите в свою учетную запись
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                <span className="text-red-700 text-sm">{error}</span>
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="email" className="text-gray-700 font-medium">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                <Input
                  id="email"
                  type="email"
                  placeholder="example@company.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (error) setError(''); // Очищаем ошибку при вводе
                  }}
                  className="pl-10 h-12 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                  disabled={loading}
                  required
                  autoComplete="email"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password" className="text-gray-700 font-medium">Пароль</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                <Input
                  id="password"
                  type="password"
                  placeholder="Введите пароль"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (error) setError(''); // Очищаем ошибку при вводе
                  }}
                  className="pl-10 h-12 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                  disabled={loading}
                  required
                  autoComplete="current-password"
                />
              </div>
            </div>
            
            <Button
              type="submit"
              className="w-full h-12 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-medium rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 disabled:transform-none disabled:opacity-50"
              disabled={loading || !email.trim() || !password}
            >
              {loading ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Проверка данных...</span>
                </div>
              ) : (
                'Войти в систему'
              )}
            </Button>
          </form>

          {/* Дополнительная информация для разработки */}
          {process.env.NODE_ENV === 'development' && (
            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-600 mb-2">Тестовые учетные данные:</p>
              <p className="text-xs text-gray-500">Admin: admin@example.com</p>
              <p className="text-xs text-gray-500">User: user@example.com</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;
