
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, Coffee, LogOut, Play, Pause, Square, Settings, User, Calendar, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';
import { supabaseApiClient } from '@/lib/supabaseApi';
import ChangePasswordDialog from '@/components/ChangePasswordDialog';

const Dashboard = () => {
  const { user, logout } = useAuth();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [breakDuration, setBreakDuration] = useState(0);
  const [userStatus, setUserStatus] = useState<'working' | 'break' | 'offline'>('offline');
  const [breakStartTime, setBreakStartTime] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Инициализация статуса пользователя
  useEffect(() => {
    if (user) {
      setUserStatus(user.status || 'offline');
      setBreakStartTime(user.breakStartTime || user.break_start_time || null);
    }
  }, [user]);

  // Логика таймера перерыва
  useEffect(() => {
    if (userStatus === 'break' && breakStartTime) {
      const interval = setInterval(() => {
        const breakStart = new Date(breakStartTime);
        const now = new Date();
        const duration = Math.floor((now.getTime() - breakStart.getTime()) / 1000);
        setBreakDuration(duration);
      }, 1000);

      return () => clearInterval(interval);
    } else {
      setBreakDuration(0);
    }
  }, [userStatus, breakStartTime]);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}ч ${minutes}м ${secs}с`;
    } else if (minutes > 0) {
      return `${minutes}м ${secs}с`;
    } else {
      return `${secs}с`;
    }
  };

  const updateUserStatusLocally = async (newStatus: 'working' | 'break' | 'offline', newBreakStartTime?: string) => {
    if (!user) return;

    try {
      const result = await supabaseApiClient.updateUserStatus(
        user.id, 
        newStatus, 
        newBreakStartTime
      );

      if (result.success) {
        setUserStatus(newStatus);
        if (newStatus === 'break' && newBreakStartTime) {
          setBreakStartTime(newBreakStartTime);
        } else if (newStatus !== 'break') {
          setBreakStartTime(null);
        }
      } else {
        throw new Error(result.error || 'Ошибка обновления статуса');
      }
    } catch (error) {
      console.error('Status update error:', error);
      throw error;
    }
  };

  const handleStartWork = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      await supabaseApiClient.timeAction(user.id, 'start_work');
      await updateUserStatusLocally('working');
      
      toast({
        title: "🎉 Работа начата",
        description: "Удачного рабочего дня!",
      });
    } catch (error) {
      toast({
        title: "❌ Ошибка",
        description: "Не удалось начать работу",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleStartBreak = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const breakStartTime = new Date().toISOString();
      await supabaseApiClient.timeAction(user.id, 'start_break');
      await updateUserStatusLocally('break', breakStartTime);
      
      toast({
        title: "☕ Перерыв начат",
        description: "Хорошего отдыха!",
      });
    } catch (error) {
      toast({
        title: "❌ Ошибка",
        description: "Не удалось начать перерыв",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEndBreak = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      await supabaseApiClient.timeAction(user.id, 'end_break', breakDuration);
      await updateUserStatusLocally('working');
      
      toast({
        title: "✅ Перерыв завершен",
        description: `Перерыв длился ${Math.floor(breakDuration / 60)} минут`,
      });
    } catch (error) {
      toast({
        title: "❌ Ошибка",
        description: "Не удалось завершить перерыв",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEndWork = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      await supabaseApiClient.timeAction(user.id, 'end_work');
      await updateUserStatusLocally('offline');
      
      toast({
        title: "🏠 Рабочий день завершен",
        description: "До свидания!",
      });
    } catch (error) {
      toast({
        title: "❌ Ошибка",
        description: "Не удалось завершить работу",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    if (logout) {
      logout();
    }
    navigate('/login');
  };

  const getStatusBadge = () => {
    switch (userStatus) {
      case 'working':
        return (
          <Badge className="bg-emerald-500/20 text-emerald-700 border-emerald-500/30 hover:bg-emerald-500/30">
            <div className="w-2 h-2 bg-emerald-500 rounded-full mr-2 animate-pulse"></div>
            На работе
          </Badge>
        );
      case 'break':
        return (
          <Badge className="bg-orange-500/20 text-orange-700 border-orange-500/30 hover:bg-orange-500/30">
            <div className="w-2 h-2 bg-orange-500 rounded-full mr-2 animate-pulse"></div>
            На перерыве
          </Badge>
        );
      default:
        return (
          <Badge className="bg-slate-500/20 text-slate-700 border-slate-500/30 hover:bg-slate-500/30">
            <div className="w-2 h-2 bg-slate-400 rounded-full mr-2"></div>
            Не в сети
          </Badge>
        );
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Доброе утро";
    if (hour < 17) return "Добрый день";
    return "Добрый вечер";
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-slate-700">Загрузка...</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Современный Header */}
      <header className="backdrop-blur-sm bg-white/80 border-b border-white/20 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
                  <Clock className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-slate-900">TimeTracker</h1>
                  <p className="text-sm text-slate-500">{getGreeting()}, {user.name}!</p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              {getStatusBadge()}
              {user.role === 'admin' && (
                <Button 
                  onClick={() => navigate('/admin-panel')} 
                  variant="outline" 
                  size="sm"
                  className="border-blue-200 text-blue-700 hover:bg-blue-50"
                >
                  <Settings className="w-4 h-4 mr-2" />
                  Админ-панель
                </Button>
              )}
              <ChangePasswordDialog userId={user.id} />
              <Button 
                onClick={handleLogout} 
                variant="outline" 
                size="sm"
                className="border-red-200 text-red-600 hover:bg-red-50"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Выйти
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Статистика */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-white/70 backdrop-blur-sm border-white/20 shadow-xl">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Текущее время</p>
                  <p className="text-2xl font-bold text-slate-900">{formatTime(currentTime)}</p>
                </div>
                <Clock className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/70 backdrop-blur-sm border-white/20 shadow-xl">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Статус</p>
                  <p className="text-lg font-semibold text-slate-900">
                    {userStatus === 'working' ? 'Работаю' : 
                     userStatus === 'break' ? 'На перерыве' : 'Оффлайн'}
                  </p>
                </div>
                <User className="w-8 h-8 text-emerald-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/70 backdrop-blur-sm border-white/20 shadow-xl">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Дата</p>
                  <p className="text-lg font-semibold text-slate-900">
                    {new Date().toLocaleDateString('ru-RU', { 
                      day: 'numeric', 
                      month: 'short' 
                    })}
                  </p>
                </div>
                <Calendar className="w-8 h-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>

          {userStatus === 'break' && (
            <Card className="bg-gradient-to-r from-orange-100 to-red-100 border-orange-200 shadow-xl">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-orange-700">Время перерыва</p>
                    <p className="text-xl font-bold text-orange-800">{formatDuration(breakDuration)}</p>
                  </div>
                  <Coffee className="w-8 h-8 text-orange-600" />
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Action Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {userStatus === 'offline' && (
            <Card className="group bg-gradient-to-br from-emerald-50 to-green-100 border-emerald-200 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
              <CardContent className="p-8">
                <div className="text-center">
                  <div className="w-20 h-20 bg-emerald-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:bg-emerald-500/20 transition-colors">
                    <Play className="w-10 h-10 text-emerald-600" />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900 mb-3">Начать работу</h3>
                  <p className="text-emerald-700 mb-6">Зафиксировать начало рабочего дня</p>
                  <Button 
                    onClick={handleStartWork} 
                    disabled={loading}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white w-full py-4 rounded-xl font-semibold shadow-lg transition-all duration-200"
                  >
                    {loading ? 'Загрузка...' : 'Начать работу'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
          
          {userStatus === 'working' && (
            <>
              <Card className="group bg-gradient-to-br from-orange-50 to-amber-100 border-orange-200 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
                <CardContent className="p-8">
                  <div className="text-center">
                    <div className="w-20 h-20 bg-orange-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:bg-orange-500/20 transition-colors">
                      <Pause className="w-10 h-10 text-orange-600" />
                    </div>
                    <h3 className="text-2xl font-bold text-slate-900 mb-3">Перерыв</h3>
                    <p className="text-orange-700 mb-6">Зафиксировать начало перерыва</p>
                    <Button 
                      onClick={handleStartBreak} 
                      disabled={loading}
                      className="bg-orange-600 hover:bg-orange-700 text-white w-full py-4 rounded-xl font-semibold shadow-lg"
                    >
                      {loading ? 'Загрузка...' : 'Начать перерыв'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="group bg-gradient-to-br from-slate-50 to-gray-100 border-slate-200 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
                <CardContent className="p-8">
                  <div className="text-center">
                    <div className="w-20 h-20 bg-slate-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:bg-slate-500/20 transition-colors">
                      <Square className="w-10 h-10 text-slate-600" />
                    </div>
                    <h3 className="text-2xl font-bold text-slate-900 mb-3">Завершить работу</h3>
                    <p className="text-slate-700 mb-6">Зафиксировать конец рабочего дня</p>
                    <Button 
                      onClick={handleEndWork} 
                      disabled={loading}
                      variant="outline" 
                      className="border-2 border-slate-300 text-slate-700 hover:bg-slate-100 w-full py-4 rounded-xl font-semibold"
                    >
                      {loading ? 'Загрузка...' : 'Завершить работу'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
          
          {userStatus === 'break' && (
            <>
              <Card className="group bg-gradient-to-br from-blue-50 to-indigo-100 border-blue-200 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
                <CardContent className="p-8">
                  <div className="text-center">
                    <div className="w-20 h-20 bg-blue-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:bg-blue-500/20 transition-colors">
                      <Play className="w-10 h-10 text-blue-600" />
                    </div>
                    <h3 className="text-2xl font-bold text-slate-900 mb-3">Вернуться к работе</h3>
                    <p className="text-blue-700 mb-6">Завершить перерыв и продолжить работу</p>
                    <Button 
                      onClick={handleEndBreak} 
                      disabled={loading}
                      className="bg-blue-600 hover:bg-blue-700 text-white w-full py-4 rounded-xl font-semibold shadow-lg"
                    >
                      {loading ? 'Загрузка...' : 'Вернуться к работе'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="group bg-gradient-to-br from-slate-50 to-gray-100 border-slate-200 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
                <CardContent className="p-8">
                  <div className="text-center">
                    <div className="w-20 h-20 bg-slate-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:bg-slate-500/20 transition-colors">
                      <Square className="w-10 h-10 text-slate-600" />
                    </div>
                    <h3 className="text-2xl font-bold text-slate-900 mb-3">Завершить работу</h3>
                    <p className="text-slate-700 mb-6">Зафиксировать конец рабочего дня</p>
                    <Button 
                      onClick={handleEndWork} 
                      disabled={loading}
                      variant="outline" 
                      className="border-2 border-slate-300 text-slate-700 hover:bg-slate-100 w-full py-4 rounded-xl font-semibold"
                    >
                      {loading ? 'Загрузка...' : 'Завершить работу'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        {/* Предупреждение о длительном перерыве */}
        {userStatus === 'break' && breakDuration > 3600 && (
          <div className="mt-8 max-w-2xl mx-auto">
            <Card className="bg-gradient-to-r from-red-50 to-pink-50 border-red-200 shadow-xl">
              <CardContent className="p-6">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-red-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-red-800">Длительный перерыв</h4>
                    <p className="text-red-700">Ваш перерыв длится уже более часа. Возможно, стоит вернуться к работе?</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
