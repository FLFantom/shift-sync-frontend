import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTimeAction, useReportLateness, useNotifyBreakExceeded } from '../hooks/useTimeActions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, Play, Pause, Coffee, LogOut, Settings } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

const Dashboard = () => {
  const { user, logout, updateUserStatus } = useAuth();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [breakDuration, setBreakDuration] = useState('');
  const navigate = useNavigate();
  const breakExceededNotifiedRef = useRef(false);
  const breakIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const timeActionMutation = useTimeAction();
  const reportLatenessMutation = useReportLateness();
  const notifyBreakExceededMutation = useNotifyBreakExceeded();

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (breakIntervalRef.current) {
      clearInterval(breakIntervalRef.current);
      breakIntervalRef.current = null;
    }

    if (user?.status === 'break' && user.breakStartTime) {
      const updateBreakDuration = () => {
        const breakStart = new Date(user.breakStartTime!);
        const now = new Date();
        const diff = Math.floor((now.getTime() - breakStart.getTime()) / 1000);
        
        const hours = Math.floor(diff / 3600);
        const minutes = Math.floor((diff % 3600) / 60);
        const seconds = diff % 60;
        
        const isOvertime = diff > 3600;
        const sign = isOvertime ? '-' : '';
        
        setBreakDuration(`${sign}${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
        
        const totalBreakMinutes = Math.floor(diff / 60);
        if (totalBreakMinutes > 60 && !breakExceededNotifiedRef.current && user) {
          breakExceededNotifiedRef.current = true;
          notifyBreakExceededMutation.mutate({
            userId: user.id,
            userName: user.name,
            userEmail: user.email,
            breakDurationMinutes: totalBreakMinutes
          });
        }
      };

      updateBreakDuration();
      breakIntervalRef.current = setInterval(updateBreakDuration, 1000);
    } else {
      setBreakDuration('');
      breakExceededNotifiedRef.current = false;
    }

    return () => {
      if (breakIntervalRef.current) {
        clearInterval(breakIntervalRef.current);
        breakIntervalRef.current = null;
      }
    };
  }, [user?.status, user?.breakStartTime, user, notifyBreakExceededMutation]);

  useEffect(() => {
    if (user?.breakStartTime) {
      const breakStart = new Date(user.breakStartTime);
      const now = new Date();
      
      const isDifferentDay = breakStart.getFullYear() !== now.getFullYear() ||
                           breakStart.getMonth() !== now.getMonth() ||
                           breakStart.getDate() !== now.getDate();
      
      if (isDifferentDay) {
        breakExceededNotifiedRef.current = false;
      }
    }
  }, [user?.breakStartTime]);

  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return 'Доброе утро';
    if (hour < 18) return 'Добрый день';
    return 'Добрый вечер';
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('ru-RU', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const calculateBreakDurationInMinutes = () => {
    if (!user?.breakStartTime) return 0;
    const breakStart = new Date(user.breakStartTime);
    const now = new Date();
    return Math.floor((now.getTime() - breakStart.getTime()) / (1000 * 60));
  };

  const handleStartWork = async () => {
    if (!user || user.status === 'working') {
      console.log('User already working or user not found');
      return;
    }

    try {
      const startTime = new Date();
      
      console.log('Sending start_work with userId:', user.id);
      
      await timeActionMutation.mutateAsync({ 
        action: 'start_work',
        userId: user.id
      });
      
      updateUserStatus('working');
      
      const workStartTime = startTime.getHours() * 3600 + startTime.getMinutes() * 60 + startTime.getSeconds();
      const nineAM = 9 * 3600;
      
      if (workStartTime > nineAM) {
        const lateSeconds = workStartTime - nineAM;
        const lateMinutes = Math.floor(lateSeconds / 60);
        
        reportLatenessMutation.mutate({
          userId: user.id,
          userName: user.name,
          userEmail: user.email,
          startTime: formatTime(startTime),
          lateMinutes: lateMinutes
        });
        
        toast({
          title: "Опоздание зафиксировано",
          description: `Вы опоздали на ${lateMinutes} минут. Уведомление отправлено руководителю.`,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Работа начата",
          description: "Удачного рабочего дня!",
        });
      }
    } catch (error) {
      console.error('Start work error:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось начать рабочий день",
        variant: "destructive",
      });
    }
  };

  const handleStartBreak = async () => {
    if (!user || user.status !== 'working') {
      console.log('User not working or user not found');
      return;
    }

    try {
      console.log('Sending start_break with userId:', user.id);
      
      await timeActionMutation.mutateAsync({ 
        action: 'start_break',
        userId: user.id
      });
      updateUserStatus('break');
      toast({
        title: "Перерыв начат",
        description: "Отдыхайте, но не забывайте о времени!",
      });
    } catch (error) {
      console.error('Start break error:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось начать перерыв",
        variant: "destructive",
      });
    }
  };

  const handleEndBreak = async () => {
    if (!user || user.status !== 'break') {
      console.log('User not on break or user not found');
      return;
    }

    try {
      const breakDurationMinutes = calculateBreakDurationInMinutes();
      
      console.log('Sending end_break with userId:', user.id, 'and breakDuration:', breakDurationMinutes);
      
      await timeActionMutation.mutateAsync({ 
        action: 'end_break',
        userId: user.id,
        breakDuration: breakDurationMinutes
      });
      
      if (breakIntervalRef.current) {
        clearInterval(breakIntervalRef.current);
        breakIntervalRef.current = null;
      }
      
      setBreakDuration('');
      breakExceededNotifiedRef.current = false;
      
      updateUserStatus('working');
      
      toast({
        title: "Перерыв окончен",
        description: "Добро пожаловать обратно!",
      });
    } catch (error) {
      console.error('End break error:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось завершить перерыв",
        variant: "destructive",
      });
    }
  };

  const handleEndWork = async () => {
    if (!user || user.status === 'offline') {
      console.log('User already offline or user not found');
      return;
    }

    try {
      console.log('Sending end_work with userId:', user.id);
      
      await timeActionMutation.mutateAsync({ 
        action: 'end_work',
        userId: user.id
      });
      updateUserStatus('offline');
      toast({
        title: "Рабочий день окончен",
        description: "Хорошего отдыха!",
      });
    } catch (error) {
      console.error('End work error:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось завершить рабочий день",
        variant: "destructive",
      });
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!user) return null;

  const isBreakOvertime = user.status === 'break' && user.breakStartTime && 
    (new Date().getTime() - new Date(user.breakStartTime).getTime()) > 3600000;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              {getGreeting()}, {user.name}!
            </h1>
            <p className="text-gray-600 mt-1">
              {formatDate(currentTime)}
            </p>
          </div>
          
          <div className="flex items-center space-x-4">
            {user.role === 'admin' && (
              <Button
                onClick={() => navigate('/admin-panel')}
                variant="outline"
                className="border-blue-200 text-blue-600 hover:bg-blue-50"
              >
                <Settings className="w-4 h-4 mr-2" />
                Админ-панель
              </Button>
            )}
            <Button
              onClick={handleLogout}
              variant="outline"
              className="border-red-200 text-red-600 hover:bg-red-50"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Выйти
            </Button>
          </div>
        </div>

        {/* Current Time */}
        <Card className="mb-8 bg-gradient-to-r from-blue-500 to-indigo-600 text-white border-0 shadow-xl">
          <CardContent className="text-center py-8">
            <Clock className="w-16 h-16 mx-auto mb-4 opacity-90" />
            <div className="text-5xl font-bold mb-2">
              {formatTime(currentTime)}
            </div>
            <div className="text-blue-100 text-lg">
              Текущее время
            </div>
          </CardContent>
        </Card>

        {/* Status and Actions */}
        {user.status === 'break' ? (
          <Card className="bg-white/80 backdrop-blur-sm shadow-xl border-0">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl text-orange-600 flex items-center justify-center">
                <Coffee className="w-8 h-8 mr-3" />
                Вы на перерыве
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-6">
              <div className={`text-6xl font-bold ${isBreakOvertime ? 'text-red-500' : 'text-orange-500'}`}>
                {breakDuration}
              </div>
              {isBreakOvertime && (
                <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
                  <p className="text-red-700 font-medium">
                    ⚠️ Перерыв превысил 1 час
                  </p>
                </div>
              )}
              <div className="flex justify-center space-x-4">
                <Button
                  onClick={handleEndBreak}
                  size="lg"
                  className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white px-8 py-4 text-lg font-medium rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
                  disabled={timeActionMutation.isPending}
                >
                  <Play className="w-6 h-6 mr-3" />
                  Закончить перерыв
                </Button>
                <Button
                  onClick={handleEndWork}
                  size="lg"
                  variant="outline"
                  className="border-gray-300 text-gray-700 hover:bg-gray-50 px-8 py-4 text-lg font-medium rounded-xl"
                  disabled={timeActionMutation.isPending}
                >
                  Завершить рабочий день
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-3 gap-6">
            <Card className="bg-white/80 backdrop-blur-sm shadow-xl border-0 hover:shadow-2xl transition-all duration-300">
              <CardContent className="text-center py-8 px-4 flex flex-col justify-between h-full min-h-[320px]">
                <div className="flex flex-col items-center flex-grow">
                  <div className="w-20 h-20 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Play className="w-10 h-10 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-800 mb-4">
                    Начать работу
                  </h3>
                  <p className="text-gray-600 mb-6 flex-grow flex items-center">
                    Зафиксировать начало рабочего дня
                  </p>
                </div>
                <Button
                  onClick={handleStartWork}
                  size="lg"
                  className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white px-6 py-4 text-base font-medium rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 w-full"
                  disabled={timeActionMutation.isPending || user.status === 'working'}
                >
                  {user.status === 'working' ? 'Уже работаете' : 'Начать работу'}
                </Button>
              </CardContent>
            </Card>

            <Card className="bg-white/80 backdrop-blur-sm shadow-xl border-0 hover:shadow-2xl transition-all duration-300">
              <CardContent className="text-center py-8 px-4 flex flex-col justify-between h-full min-h-[320px]">
                <div className="flex flex-col items-center flex-grow">
                  <div className="w-20 h-20 bg-gradient-to-r from-orange-400 to-yellow-500 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Pause className="w-10 h-10 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-800 mb-4">
                    Перерыв
                  </h3>
                  <p className="text-gray-600 mb-6 flex-grow flex items-center">
                    Зафиксировать начало перерыва
                  </p>
                </div>
                <Button
                  onClick={handleStartBreak}
                  size="lg"
                  className="bg-gradient-to-r from-orange-500 to-yellow-600 hover:from-orange-600 hover:to-yellow-700 text-white px-6 py-4 text-base font-medium rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 w-full"
                  disabled={timeActionMutation.isPending || user.status !== 'working'}
                >
                  {user.status !== 'working' ? 'Сначала начните работу' : 'Начать перерыв'}
                </Button>
              </CardContent>
            </Card>

            <Card className="bg-white/80 backdrop-blur-sm shadow-xl border-0 hover:shadow-2xl transition-all duration-300">
              <CardContent className="text-center py-8 px-4 flex flex-col justify-between h-full min-h-[320px]">
                <div className="flex flex-col items-center flex-grow">
                  <div className="w-20 h-20 bg-gradient-to-r from-red-400 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Clock className="w-10 h-10 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-800 mb-4">
                    Завершить день
                  </h3>
                  <p className="text-gray-600 mb-6 flex-grow flex items-center">
                    Зафиксировать окончание рабочего дня
                  </p>
                </div>
                <Button
                  onClick={handleEndWork}
                  size="lg"
                  className="bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 text-white px-6 py-4 text-base font-medium rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 w-full"
                  disabled={timeActionMutation.isPending || user.status === 'offline'}
                >
                  {user.status === 'offline' ? 'День завершен' : 'Завершить день'}
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Current Status */}
        <Card className="mt-8 bg-white/80 backdrop-blur-sm shadow-xl border-0">
          <CardContent className="py-6">
            <div className="flex items-center justify-center space-x-4">
              <div className={`w-3 h-3 rounded-full ${
                user.status === 'working' ? 'bg-green-500' : 
                user.status === 'break' ? 'bg-orange-500' : 'bg-gray-500'
              }`}></div>
              <span className="text-lg font-medium text-gray-700">
                Статус: {
                  user.status === 'working' ? 'На работе' :
                  user.status === 'break' ? 'На перерыве' : 'Не в сети'
                }
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
