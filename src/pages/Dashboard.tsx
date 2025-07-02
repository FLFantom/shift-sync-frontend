
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, Coffee, LogOut, Play, Pause, Square, Settings, ArrowLeft, Timer } from 'lucide-react';
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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <div className="flex justify-between items-center p-6">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            Привет, {user.name}!
          </h1>
          <p className="text-gray-300 mt-2">{new Date().toLocaleDateString('ru-RU', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
        <div className="flex items-center space-x-3">
          {isAdminMode && (
            <Button onClick={() => { returnToAdmin(); }} variant="outline" size="sm" className="border-purple-400 text-purple-400 hover:bg-purple-400 hover:text-white">
              <ArrowLeft className="w-4 h-4 mr-2" />Вернуться к администратору
            </Button>
          )}
          {user.role === 'admin' && (
            <Button onClick={() => navigate('/admin-panel')} variant="outline" className="border-blue-400 text-blue-400 hover:bg-blue-400 hover:text-white">
              <Settings className="w-4 h-4 mr-2" />Админ-панель
            </Button>
          )}
          <ChangePasswordDialog userId={user.id} />
          <Button onClick={handleLogout} variant="outline" className="border-red-400 text-red-400 hover:bg-red-400 hover:text-white">
            <LogOut className="w-4 h-4 mr-2" />Выйти
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex items-center justify-center min-h-[calc(100vh-200px)] px-6">
        <div className="w-full max-w-6xl">
          
          {/* Current Time Display */}
          <div className="text-center mb-12">
            <div className="inline-block bg-white/5 backdrop-blur-xl rounded-3xl p-8 border border-white/10 shadow-2xl">
              <Clock className="w-16 h-16 mx-auto mb-6 text-blue-400" />
              <div className="text-7xl font-bold text-white mb-4">
                {formatTime(currentTime)}
              </div>
              <div className="flex items-center justify-center gap-3 text-xl">
                <span className="text-gray-300">Статус:</span>
                {getStatusBadge()}
              </div>
            </div>
          </div>

          {/* Break Timer */}
          {status === 'break' && (
            <div className="text-center mb-12">
              <div className="inline-block bg-gradient-to-r from-orange-500/20 to-red-500/20 backdrop-blur-xl rounded-3xl p-8 border border-orange-400/30 shadow-2xl">
                <Coffee className="w-12 h-12 mx-auto mb-4 text-orange-400" />
                <div className="text-5xl font-bold text-orange-300 mb-2">
                  {formatDuration(breakDuration)}
                </div>
                <div className="text-orange-200">
                  {breakDuration > 3600 ? (
                    <span className="font-bold text-red-300">⚠️ Превышено время перерыва!</span>
                  ) : (
                    'Время перерыва'
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Action Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {status === 'offline' && (
              <Card 
                className="group bg-gradient-to-br from-green-500/20 to-emerald-600/20 backdrop-blur-xl border-green-400/30 shadow-2xl cursor-pointer hover:shadow-green-500/25 hover:scale-105 transition-all duration-300 rounded-3xl" 
                onClick={handleStartWork}
              >
                <CardContent className="p-10 text-center">
                  <div className="w-24 h-24 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-8 group-hover:bg-green-500/30 transition-colors">
                    <Play className="w-12 h-12 text-green-400" />
                  </div>
                  <h3 className="text-3xl font-bold text-white mb-4">Начать работу</h3>
                  <p className="text-green-200 mb-8 text-lg">Зафиксировать начало рабочего дня</p>
                  <Button className="bg-green-500 hover:bg-green-600 text-white w-full py-4 text-lg font-semibold rounded-xl shadow-lg">
                    Начать работу
                  </Button>
                </CardContent>
              </Card>
            )}
            
            {status === 'working' && (
              <>
                <Card 
                  className="group bg-gradient-to-br from-orange-500/20 to-amber-600/20 backdrop-blur-xl border-orange-400/30 shadow-2xl cursor-pointer hover:shadow-orange-500/25 hover:scale-105 transition-all duration-300 rounded-3xl" 
                  onClick={handleStartBreak}
                >
                  <CardContent className="p-10 text-center">
                    <div className="w-24 h-24 bg-orange-500/20 rounded-full flex items-center justify-center mx-auto mb-8 group-hover:bg-orange-500/30 transition-colors">
                      <Pause className="w-12 h-12 text-orange-400" />
                    </div>
                    <h3 className="text-3xl font-bold text-white mb-4">Перерыв</h3>
                    <p className="text-orange-200 mb-8 text-lg">Зафиксировать начало перерыва</p>
                    <Button className="bg-orange-500 hover:bg-orange-600 text-white w-full py-4 text-lg font-semibold rounded-xl shadow-lg">
                      Начать перерыв
                    </Button>
                  </CardContent>
                </Card>
                
                <Card className="group bg-white/5 backdrop-blur-xl border-white/10 shadow-2xl hover:shadow-white/20 hover:scale-105 transition-all duration-300 rounded-3xl">
                  <CardContent className="p-10 text-center">
                    <div className="w-24 h-24 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-8 group-hover:bg-white/20 transition-colors">
                      <Square className="w-12 h-12 text-gray-300" />
                    </div>
                    <h3 className="text-3xl font-bold text-white mb-4">Завершить работу</h3>
                    <p className="text-gray-300 mb-8 text-lg">Зафиксировать конец рабочего дня</p>
                    <Button onClick={handleEndWork} variant="outline" className="border-2 border-white/30 text-white hover:bg-white hover:text-gray-900 w-full py-4 text-lg font-semibold rounded-xl">
                      Завершить работу
                    </Button>
                  </CardContent>
                </Card>
              </>
            )}
            
            {status === 'break' && (
              <>
                <Card 
                  className="group bg-gradient-to-br from-blue-500/20 to-indigo-600/20 backdrop-blur-xl border-blue-400/30 shadow-2xl cursor-pointer hover:shadow-blue-500/25 hover:scale-105 transition-all duration-300 rounded-3xl" 
                  onClick={handleEndBreak}
                >
                  <CardContent className="p-10 text-center">
                    <div className="w-24 h-24 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-8 group-hover:bg-blue-500/30 transition-colors">
                      <Play className="w-12 h-12 text-blue-400" />
                    </div>
                    <h3 className="text-3xl font-bold text-white mb-4">Вернуться к работе</h3>
                    <p className="text-blue-200 mb-8 text-lg">Завершить перерыв и продолжить работу</p>
                    <Button className="bg-blue-500 hover:bg-blue-600 text-white w-full py-4 text-lg font-semibold rounded-xl shadow-lg">
                      Вернуться к работе
                    </Button>
                  </CardContent>
                </Card>
                
                <Card className="group bg-white/5 backdrop-blur-xl border-white/10 shadow-2xl hover:shadow-white/20 hover:scale-105 transition-all duration-300 rounded-3xl">
                  <CardContent className="p-10 text-center">
                    <div className="w-24 h-24 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-8 group-hover:bg-white/20 transition-colors">
                      <Square className="w-12 h-12 text-gray-300" />
                    </div>
                    <h3 className="text-3xl font-bold text-white mb-4">Завершить работу</h3>
                    <p className="text-gray-300 mb-8 text-lg">Зафиксировать конец рабочего дня</p>
                    <Button onClick={handleEndWork} variant="outline" className="border-2 border-white/30 text-white hover:bg-white hover:text-gray-900 w-full py-4 text-lg font-semibold rounded-xl">
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
