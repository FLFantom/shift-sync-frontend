
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, Coffee, LogOut, User, Play, Pause, Square, Settings, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';
import { supabaseApiClient } from '@/lib/supabaseApi';
import ChangePasswordDialog from '@/components/ChangePasswordDialog';

const Dashboard = () => {
  const { user, logout, updateUserStatus, isAdminMode, returnToAdmin } = useAuth();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [breakDuration, setBreakDuration] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

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
      await supabaseApiClient.timeAction(user.id, 'start_work');
      updateUserStatus('working');
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

  const getActionButtons = () => {
    const status = user?.status || 'offline';
    
    switch (status) {
      case 'offline':
        return (
          <Button onClick={handleStartWork} className="w-full bg-green-600 hover:bg-green-700">
            <Play className="w-4 h-4 mr-2" />
            Начать работу
          </Button>
        );
      case 'working':
        return (
          <div className="space-y-2">
            <Button onClick={handleStartBreak} className="w-full bg-orange-600 hover:bg-orange-700">
              <Pause className="w-4 h-4 mr-2" />
              Начать перерыв
            </Button>
            <Button onClick={handleEndWork} variant="outline" className="w-full">
              <Square className="w-4 h-4 mr-2" />
              Завершить работу
            </Button>
          </div>
        );
      case 'break':
        return (
          <div className="space-y-2">
            <Button onClick={handleEndBreak} className="w-full bg-blue-600 hover:bg-blue-700">
              <Play className="w-4 h-4 mr-2" />
              Вернуться к работе
            </Button>
            <Button onClick={handleEndWork} variant="outline" className="w-full">
              <Square className="w-4 h-4 mr-2" />
              Завершить работу
            </Button>
          </div>
        );
      default:
        return null;
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Система учета времени
            </h1>
            <p className="text-gray-600 mt-1">Добро пожаловать, {user.name}!</p>
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

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <Card className="bg-white/80 backdrop-blur-sm shadow-xl border-0">
            <CardHeader>
              <CardTitle className="flex items-center text-gray-800">
                <Clock className="w-5 h-5 mr-2 text-blue-600" />
                Текущее время
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-blue-600 mb-2">
                {formatTime(currentTime)}
              </div>
              <div className="text-sm text-gray-500">
                {currentTime.toLocaleDateString('ru-RU', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur-sm shadow-xl border-0">
            <CardHeader>
              <CardTitle className="flex items-center text-gray-800">
                <User className="w-5 h-5 mr-2 text-indigo-600" />
                Статус сотрудника
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between mb-4">
                <span className="text-lg font-medium text-gray-700">{user.name}</span>
                {getStatusBadge()}
              </div>
              <div className="text-sm text-gray-500 mb-2">
                Email: {user.email}
              </div>
              <div className="text-sm text-gray-500">
                Роль: {user.role === 'admin' ? 'Администратор' : 'Сотрудник'}
              </div>
            </CardContent>
          </Card>
        </div>

        {user.status === 'break' && (
          <Card className="bg-gradient-to-r from-orange-500 to-red-600 text-white shadow-xl border-0 mb-6">
            <CardHeader>
              <CardTitle className="flex items-center text-white">
                <Coffee className="w-5 h-5 mr-2" />
                Перерыв в процессе
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold mb-2">
                {formatDuration(breakDuration)}
              </div>
              <div className="text-orange-100">
                {breakDuration > 3600 ? (
                  <span className="font-bold">⚠️ Превышено время перерыва!</span>
                ) : (
                  'Хорошего отдыха!'
                )}
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="bg-white/80 backdrop-blur-sm shadow-xl border-0">
          <CardHeader>
            <CardTitle className="text-gray-800">Управление рабочим временем</CardTitle>
          </CardHeader>
          <CardContent>
            {getActionButtons()}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
