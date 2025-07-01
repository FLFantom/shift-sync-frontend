
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, Coffee, LogOut, User, Play, Pause, Square, Settings, ArrowLeft, Timer } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';
import { supabaseApiClient } from '@/lib/supabaseApi';
import ChangePasswordDialog from '@/components/ChangePasswordDialog';

const Dashboard = () => {
  const { user, logout, updateUserStatus, isAdminMode, returnToAdmin } = useAuth();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [breakDuration, setBreakDuration] = useState(0);
  const [workDuration, setWorkDuration] = useState(0);
  const [workStartTime, setWorkStartTime] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Логика таймера перерыва
  useEffect(() => {
    if (user?.status === 'break' && user.breakStartTime) {
      const interval = setInterval(() => {
        const breakStart = new Date(user.breakStartTime!);
        const now = new Date();
        const duration = Math.floor((now.getTime() - breakStart.getTime()) / 1000);
        setBreakDuration(duration);
      }, 1000);

      return () => clearInterval(interval);
    } else {
      setBreakDuration(0);
    }
  }, [user?.status, user?.breakStartTime]);

  // Логика таймера работы
  useEffect(() => {
    if (user?.status === 'working') {
      // Проверяем, есть ли сохраненное время начала работы за сегодня
      const today = new Date().toDateString();
      const savedWorkStart = localStorage.getItem(`workStartTime_${user.id}_${today}`);
      
      if (savedWorkStart) {
        setWorkStartTime(savedWorkStart);
      }

      const interval = setInterval(() => {
        const workStart = savedWorkStart || workStartTime;
        if (workStart) {
          const start = new Date(workStart);
          const now = new Date();
          const duration = Math.floor((now.getTime() - start.getTime()) / 1000);
          setWorkDuration(duration);
        }
      }, 1000);

      return () => clearInterval(interval);
    } else {
      setWorkDuration(0);
    }
  }, [user?.status, workStartTime, user?.id]);

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

  const handleStartWork = async () => {
    if (!user) return;
    
    try {
      const now = new Date().toISOString();
      const today = new Date().toDateString();
      
      await supabaseApiClient.timeAction(user.id, 'start_work');
      updateUserStatus('working');
      
      // Сохраняем время начала работы
      setWorkStartTime(now);
      localStorage.setItem(`workStartTime_${user.id}_${today}`, now);
      
      toast({
        title: "Работа начата",
        description: "Удачного рабочего дня!",
      });
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось начать работу",
        variant: "destructive",
      });
    }
  };

  const handleStartBreak = async () => {
    if (!user) return;
    
    try {
      const breakStartTime = new Date().toISOString();
      await supabaseApiClient.timeAction(user.id, 'start_break');
      updateUserStatus('break', breakStartTime);
      toast({
        title: "Перерыв начат",
        description: "Хорошего отдыха!",
      });
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось начать перерыв",
        variant: "destructive",
      });
    }
  };

  const handleEndBreak = async () => {
    if (!user) return;
    
    try {
      const breakDurationMinutes = Math.floor(breakDuration / 60);
      await supabaseApiClient.timeAction(user.id, 'end_break', breakDuration);
      updateUserStatus('working');
      toast({
        title: "Перерыв завершен",
        description: `Перерыв длился ${breakDurationMinutes} минут`,
      });
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось завершить перерыв",
        variant: "destructive",
      });
    }
  };

  const handleEndWork = async () => {
    if (!user) return;
    
    try {
      await supabaseApiClient.timeAction(user.id, 'end_work');
      updateUserStatus('offline');
      
      // Очищаем время начала работы
      const today = new Date().toDateString();
      localStorage.removeItem(`workStartTime_${user.id}_${today}`);
      setWorkStartTime(null);
      
      toast({
        title: "Рабочий день завершен",
        description: "До свидания!",
      });
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось завершить работу",
        variant: "destructive",
      });
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getStatusBadge = () => {
    switch (user?.status) {
      case 'working':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">На работе</Badge>;
      case 'break':
        return <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100">На перерыве</Badge>;
      default:
        return <Badge variant="secondary">Не в сети</Badge>;
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-bold text-gray-800 mb-2">Загрузка...</h2>
        </div>
      </div>
    );
  }

  const status = user?.status || 'offline';

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Header with buttons */}
      <div className="flex justify-between items-center p-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            {user.role === 'admin' ? 'Админ панель' : `Привет, ${user.name}!`}
          </h1>
          <p className="text-gray-600 mt-1">{new Date().toLocaleDateString('ru-RU', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
        <div className="flex items-center space-x-2">
          {isAdminMode && (
            <Button onClick={() => { returnToAdmin(); }} variant="outline" size="sm" className="border-purple-200 text-purple-600 hover:bg-purple-50">
              <ArrowLeft className="w-4 h-4 mr-2" />Вернуться к администратору
            </Button>
          )}
          {user.role === 'admin' && (
            <Button onClick={() => navigate('/admin-panel')} variant="outline" className="border-blue-200 text-blue-600 hover:bg-blue-50">
              <Settings className="w-4 h-4 mr-2" />Админ-панель
            </Button>
          )}
          <ChangePasswordDialog userId={user.id} />
          <Button onClick={handleLogout} variant="outline" className="border-red-200 text-red-600 hover:bg-red-50">
            <LogOut className="w-4 h-4 mr-2" />Выйти
          </Button>
        </div>
      </div>

      {/* Main content area */}
      <div className="flex items-center justify-center min-h-[calc(100vh-120px)] p-4">
        <div className="w-full max-w-4xl">
          
          {/* Current time card */}
          <div className="text-center mb-8">
            <div className="inline-block bg-white/80 backdrop-blur-sm rounded-3xl shadow-2xl p-8 border border-white/20">
              <Clock className="w-16 h-16 mx-auto mb-4 text-blue-600" />
              <div className="text-6xl font-bold text-gray-800 mb-2">
                {formatTime(currentTime)}
              </div>
              <div className="text-blue-600 text-lg font-medium flex items-center justify-center gap-2">
                <User className="w-5 h-5" />
                Статус: {getStatusBadge()}
              </div>
            </div>
          </div>

          {/* Break timer if on break */}
          {status === 'break' && (
            <div className="text-center mb-8">
              <div className="inline-block bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-3xl shadow-2xl p-6 border border-white/20">
                <Coffee className="w-12 h-12 mx-auto mb-4" />
                <div className="text-4xl font-bold mb-2">
                  {formatDuration(breakDuration)}
                </div>
                <div className="text-orange-100">
                  {breakDuration > 3600 ? (
                    <span className="font-bold">⚠️ Превышено время перерыва!</span>
                  ) : (
                    'Хорошего отдыха!'
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Action cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
            {status === 'offline' && (
              <Card 
                className="bg-gradient-to-br from-green-500 to-green-600 text-white shadow-2xl border-0 cursor-pointer hover:shadow-3xl hover:scale-105 transition-all duration-300 rounded-3xl" 
                onClick={handleStartWork}
              >
                <CardContent className="p-8 text-center">
                  <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Play className="w-10 h-10" />
                  </div>
                  <h3 className="text-2xl font-bold mb-3">Начать работу</h3>
                  <p className="text-green-100 mb-6">Зафиксировать начало рабочего дня</p>
                  <Button className="bg-white text-green-600 hover:bg-gray-100 w-full font-semibold py-3 rounded-xl">
                    Начать работу
                  </Button>
                </CardContent>
              </Card>
            )}
            
            {status === 'working' && (
              <>
                <Card 
                  className="bg-gradient-to-br from-orange-500 to-orange-600 text-white shadow-2xl border-0 cursor-pointer hover:shadow-3xl hover:scale-105 transition-all duration-300 rounded-3xl" 
                  onClick={handleStartBreak}
                >
                  <CardContent className="p-8 text-center">
                    <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-6">
                      <Pause className="w-10 h-10" />
                    </div>
                    <h3 className="text-2xl font-bold mb-3">Перерыв</h3>
                    <p className="text-orange-100 mb-6">Зафиксировать начало перерыва</p>
                    <Button className="bg-white text-orange-600 hover:bg-gray-100 w-full font-semibold py-3 rounded-xl">
                      Начать перерыв
                    </Button>
                  </CardContent>
                </Card>
                
                <Card className="bg-white/90 backdrop-blur-sm shadow-2xl border-0 hover:shadow-3xl hover:scale-105 transition-all duration-300 rounded-3xl">
                  <CardContent className="p-8 text-center">
                    <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                      <Square className="w-10 h-10 text-gray-600" />
                    </div>
                    <h3 className="text-2xl font-bold mb-3 text-gray-800">Завершить работу</h3>
                    <p className="text-gray-600 mb-6">Зафиксировать конец рабочего дня</p>
                    <Button onClick={handleEndWork} variant="outline" className="w-full py-3 rounded-xl border-2">
                      Завершить работу
                    </Button>
                  </CardContent>
                </Card>
              </>
            )}
            
            {status === 'break' && (
              <>
                <Card 
                  className="bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-2xl border-0 cursor-pointer hover:shadow-3xl hover:scale-105 transition-all duration-300 rounded-3xl" 
                  onClick={handleEndBreak}
                >
                  <CardContent className="p-8 text-center">
                    <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-6">
                      <Play className="w-10 h-10" />
                    </div>
                    <h3 className="text-2xl font-bold mb-3">Вернуться к работе</h3>
                    <p className="text-blue-100 mb-6">Завершить перерыв</p>
                    <Button className="bg-white text-blue-600 hover:bg-gray-100 w-full font-semibold py-3 rounded-xl">
                      Вернуться к работе
                    </Button>
                  </CardContent>
                </Card>
                
                <Card className="bg-white/90 backdrop-blur-sm shadow-2xl border-0 hover:shadow-3xl hover:scale-105 transition-all duration-300 rounded-3xl">
                  <CardContent className="p-8 text-center">
                    <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                      <Square className="w-10 h-10 text-gray-600" />
                    </div>
                    <h3 className="text-2xl font-bold mb-3 text-gray-800">Завершить работу</h3>
                    <p className="text-gray-600 mb-6">Зафиксировать конец рабочего дня</p>
                    <Button onClick={handleEndWork} variant="outline" className="w-full py-3 rounded-xl border-2">
                      Завершить работу
                    </Button>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
