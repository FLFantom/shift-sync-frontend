
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, Coffee, LogOut, Play, Pause, Square, Settings, ArrowLeft } from 'lucide-react';
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

  // Логика таймера перерыва
  useEffect(() => {
    if (user?.status === 'break' && (user.breakStartTime || user.break_start_time)) {
      const interval = setInterval(() => {
        const breakStart = new Date(user.breakStartTime || user.break_start_time!);
        const now = new Date();
        const duration = Math.floor((now.getTime() - breakStart.getTime()) / 1000);
        setBreakDuration(duration);
      }, 1000);

      return () => clearInterval(interval);
    } else {
      setBreakDuration(0);
    }
  }, [user?.status, user?.breakStartTime, user?.break_start_time]);

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
      await supabaseApiClient.timeAction(user.id, 'end_break', breakDuration);
      updateUserStatus('working');
      toast({
        title: "Перерыв завершен",
        description: `Перерыв длился ${Math.floor(breakDuration / 60)} минут`,
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
      {/* Header */}
      <div className="flex justify-between items-center p-6">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Привет, {user.name}!
          </h1>
          <p className="text-gray-600 mt-2">{new Date().toLocaleDateString('ru-RU', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
        <div className="flex items-center space-x-3">
          {isAdminMode && (
            <Button onClick={() => { returnToAdmin(); }} variant="outline" size="sm" className="border-purple-400 text-purple-600 hover:bg-purple-50">
              <ArrowLeft className="w-4 h-4 mr-2" />Вернуться к администратору
            </Button>
          )}
          {user.role === 'admin' && (
            <Button onClick={() => navigate('/admin-panel')} variant="outline" className="border-blue-400 text-blue-600 hover:bg-blue-50">
              <Settings className="w-4 h-4 mr-2" />Админ-панель
            </Button>
          )}
          <ChangePasswordDialog userId={user.id} />
          <Button onClick={handleLogout} variant="outline" className="border-red-400 text-red-600 hover:bg-red-50">
            <LogOut className="w-4 h-4 mr-2" />Выйти
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex items-center justify-center min-h-[calc(100vh-200px)] px-6">
        <div className="w-full max-w-6xl">
          
          {/* Current Time Display */}
          <div className="text-center mb-8">
            <div className="inline-block bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-white/40 shadow-xl">
              <Clock className="w-12 h-12 mx-auto mb-4 text-blue-600" />
              <div className="text-5xl font-bold text-gray-800 mb-3">
                {formatTime(currentTime)}
              </div>
              <div className="flex items-center justify-center gap-2 text-lg">
                <span className="text-gray-600">Статус:</span>
                {getStatusBadge()}
              </div>
            </div>
          </div>

          {/* Break Timer */}
          {status === 'break' && (
            <div className="text-center mb-8">
              <div className="inline-block bg-gradient-to-r from-orange-100 to-red-100 rounded-2xl p-6 border border-orange-200 shadow-lg">
                <Coffee className="w-10 h-10 mx-auto mb-3 text-orange-600" />
                <div className="text-3xl font-bold text-orange-700 mb-2">
                  {formatDuration(breakDuration)}
                </div>
                <div className="text-orange-600">
                  {breakDuration > 3600 ? (
                    <span className="font-bold text-red-600">⚠️ Превышено время перерыва!</span>
                  ) : (
                    'Время перерыва'
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Action Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {status === 'offline' && (
              <Card 
                className="group bg-gradient-to-br from-green-50 to-emerald-100 border-green-200 shadow-lg cursor-pointer hover:shadow-xl hover:scale-105 transition-all duration-300 rounded-2xl" 
                onClick={handleStartWork}
              >
                <CardContent className="p-8 text-center">
                  <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:bg-green-500/20 transition-colors">
                    <Play className="w-8 h-8 text-green-600" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-800 mb-3">Начать работу</h3>
                  <p className="text-green-700 mb-6">Зафиксировать начало рабочего дня</p>
                  <Button className="bg-green-600 hover:bg-green-700 text-white w-full py-3 rounded-xl font-semibold shadow-md">
                    Начать работу
                  </Button>
                </CardContent>
              </Card>
            )}
            
            {status === 'working' && (
              <>
                <Card 
                  className="group bg-gradient-to-br from-orange-50 to-amber-100 border-orange-200 shadow-lg cursor-pointer hover:shadow-xl hover:scale-105 transition-all duration-300 rounded-2xl" 
                  onClick={handleStartBreak}
                >
                  <CardContent className="p-8 text-center">
                    <div className="w-16 h-16 bg-orange-500/10 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:bg-orange-500/20 transition-colors">
                      <Pause className="w-8 h-8 text-orange-600" />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-800 mb-3">Перерыв</h3>
                    <p className="text-orange-700 mb-6">Зафиксировать начало перерыва</p>
                    <Button className="bg-orange-600 hover:bg-orange-700 text-white w-full py-3 rounded-xl font-semibold shadow-md">
                      Начать перерыв
                    </Button>
                  </CardContent>
                </Card>
                
                <Card className="group bg-gradient-to-br from-gray-50 to-slate-100 border-gray-200 shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 rounded-2xl">
                  <CardContent className="p-8 text-center">
                    <div className="w-16 h-16 bg-gray-500/10 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:bg-gray-500/20 transition-colors">
                      <Square className="w-8 h-8 text-gray-600" />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-800 mb-3">Завершить работу</h3>
                    <p className="text-gray-700 mb-6">Зафиксировать конец рабочего дня</p>
                    <Button onClick={handleEndWork} variant="outline" className="border-2 border-gray-300 text-gray-700 hover:bg-gray-100 w-full py-3 rounded-xl font-semibold">
                      Завершить работу
                    </Button>
                  </CardContent>
                </Card>
              </>
            )}
            
            {status === 'break' && (
              <>
                <Card 
                  className="group bg-gradient-to-br from-blue-50 to-indigo-100 border-blue-200 shadow-lg cursor-pointer hover:shadow-xl hover:scale-105 transition-all duration-300 rounded-2xl" 
                  onClick={handleEndBreak}
                >
                  <CardContent className="p-8 text-center">
                    <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:bg-blue-500/20 transition-colors">
                      <Play className="w-8 h-8 text-blue-600" />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-800 mb-3">Вернуться к работе</h3>
                    <p className="text-blue-700 mb-6">Завершить перерыв и продолжить работу</p>
                    <Button className="bg-blue-600 hover:bg-blue-700 text-white w-full py-3 rounded-xl font-semibold shadow-md">
                      Вернуться к работе
                    </Button>
                  </CardContent>
                </Card>
                
                <Card className="group bg-gradient-to-br from-gray-50 to-slate-100 border-gray-200 shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 rounded-2xl">
                  <CardContent className="p-8 text-center">
                    <div className="w-16 h-16 bg-gray-500/10 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:bg-gray-500/20 transition-colors">
                      <Square className="w-8 h-8 text-gray-600" />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-800 mb-3">Завершить работу</h3>
                    <p className="text-gray-700 mb-6">Зафиксировать конец рабочего дня</p>
                    <Button onClick={handleEndWork} variant="outline" className="border-2 border-gray-300 text-gray-700 hover:bg-gray-100 w-full py-3 rounded-xl font-semibold">
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
