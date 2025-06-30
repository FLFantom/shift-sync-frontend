import { useAuth } from '../contexts/AuthContext';
import { useGetAllUsers, useUpdateUser, useDeleteUser } from '../hooks/useAdminApi';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Users, Settings, ArrowLeft, Trash2, Loader2, LogIn, RefreshCw, Bug } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import UserDialog from '../components/UserDialog';
import React, { useCallback, useState } from 'react';
import { toast } from '@/hooks/use-toast';

const AdminPanel = () => {
  const { user, loginAsUser, isAdminMode, returnToAdmin, token } = useAuth();
  const navigate = useNavigate();
  const [debugInfo, setDebugInfo] = useState<string[]>([]);

  const { data: employees, isLoading, error, refetch, isFetching } = useGetAllUsers();
  const updateUserMutation = useUpdateUser();
  const deleteUserMutation = useDeleteUser();

  // Функция для добавления отладочной информации
  const addDebugInfo = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setDebugInfo(prev => [`[${timestamp}] ${message}`, ...prev.slice(0, 9)]);
    console.log(`[DEBUG] ${message}`);
  };

  // Тестовая функция для проверки API
  const testApiEndpoints = async () => {
    addDebugInfo('Начало тестирования API endpoints...');
    
    try {
      // Тест получения пользователей
      addDebugInfo('Тестирование GET /admin/users...');
      const response = await fetch('https://gelding-able-sailfish.ngrok-free.app/webhook/admin/users', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true'
        }
      });
      
      addDebugInfo(`GET /admin/users ответ: ${response.status} ${response.statusText}`);
      
      if (response.ok) {
        const data = await response.text();
        addDebugInfo(`Данные получены: ${data.length} символов`);
        try {
          const parsed = JSON.parse(data);
          addDebugInfo(`JSON парсинг успешен. Тип: ${typeof parsed}, Array: ${Array.isArray(parsed)}`);
        } catch (e) {
          addDebugInfo(`Ошибка парсинга JSON: ${e}`);
        }
      } else {
        const errorText = await response.text();
        addDebugInfo(`Ошибка API: ${errorText}`);
      }
    } catch (error) {
      addDebugInfo(`Ошибка сети: ${error}`);
    }
  };

  // Тест удаления пользователя
  const testDeleteUser = async (userId: number) => {
    addDebugInfo(`Тестирование DELETE для пользователя ${userId}...`);
    
    try {
      const url = `https://gelding-able-sailfish.ngrok-free.app/webhook/admin/user/${userId}`;
      addDebugInfo(`URL удаления: ${url}`);
      
      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true'
        }
      });
      
      addDebugInfo(`DELETE ответ: ${response.status} ${response.statusText}`);
      
      if (response.ok) {
        const data = await response.text();
        addDebugInfo(`Удаление успешно: ${data}`);
        refetch(); // Обновляем список
      } else {
        const errorText = await response.text();
        addDebugInfo(`Ошибка удаления: ${errorText}`);
      }
    } catch (error) {
      addDebugInfo(`Ошибка сети при удалении: ${error}`);
    }
  };

  React.useEffect(() => {
    addDebugInfo('AdminPanel загружен');
    addDebugInfo(`Токен доступен: ${!!token}`);
    addDebugInfo(`Пользователь: ${user?.name} (${user?.role})`);
  }, []);

  // Автообновление каждые 10 секунд
  React.useEffect(() => {
    const interval = setInterval(() => {
      addDebugInfo('Автообновление списка пользователей...');
      refetch();
    }, 10000);

    return () => clearInterval(interval);
  }, [refetch]);

  // Обновление при фокусе на окне
  React.useEffect(() => {
    const handleFocus = () => {
      addDebugInfo('Окно получило фокус, обновление данных...');
      refetch();
    };

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        addDebugInfo('Страница стала видимой, обновление данных...');
        refetch();
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [refetch]);

  React.useEffect(() => {
    if (employees) {
      addDebugInfo(`Получены данные о ${employees.length} пользователях`);
      employees.forEach((emp, index) => {
        addDebugInfo(`Пользователь ${index + 1}: ${emp.name} (${emp.status || 'no status'})`);
      });
    }
  }, [employees]);

  React.useEffect(() => {
    if (error) {
      addDebugInfo(`Ошибка загрузки: ${error}`);
    }
  }, [error]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'working':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">На работе</Badge>;
      case 'break':
        return <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100">На перерыве</Badge>;
      default:
        return <Badge variant="secondary">Не в сети</Badge>;
    }
  };

  const getBreakDuration = (breakStartTime: string) => {
    const breakStart = new Date(breakStartTime);
    const now = new Date();
    const diff = Math.floor((now.getTime() - breakStart.getTime()) / 1000);
    const hours = Math.floor(diff / 3600);
    const minutes = Math.floor((diff % 3600) / 60);
    const isOvertime = diff > 3600;
    const color = isOvertime ? 'text-red-600 font-bold' : 'text-orange-600';
    return (
      <span className={color}>
        {hours > 0 ? `${hours}ч ` : ''}{minutes}м{isOvertime ? ' (превышение!)' : ''}
      </span>
    );
  };

  const handleUpdateUser = useCallback((userData: { name: string; email: string; role: 'user' | 'admin' }, userId: number) => {
    addDebugInfo(`Попытка обновления пользователя ${userId}: ${userData.name}`);
    updateUserMutation.mutate({ userId, data: { name: userData.name, role: userData.role } }, {
      onSuccess: () => {
        addDebugInfo(`Пользователь ${userId} успешно обновлен`);
        refetch();
      },
      onError: (error) => {
        addDebugInfo(`Ошибка обновления пользователя ${userId}: ${error}`);
      }
    });
  }, [updateUserMutation, refetch]);

  const handleDeleteUser = useCallback((employeeId: number, employeeName: string) => {
    addDebugInfo(`Попытка удаления пользователя ${employeeId}: ${employeeName}`);
    deleteUserMutation.mutate(employeeId, {
      onSuccess: () => {
        addDebugInfo(`Пользователь ${employeeName} успешно удален`);
        toast({ title: "Удаление", description: `Пользователь ${employeeName} удален`, variant: "destructive" });
        refetch();
      },
      onError: (error) => {
        addDebugInfo(`Ошибка удаления пользователя ${employeeName}: ${error}`);
        toast({ title: "Ошибка", description: "Не удалось удалить пользователя", variant: "destructive" });
      }
    });
  }, [deleteUserMutation, refetch]);

  const handleLoginAsUser = useCallback(async (employeeId: string, employeeName: string) => {
    addDebugInfo(`Попытка входа под пользователем ${employeeId}: ${employeeName}`);
    try {
      const success = await loginAsUser(employeeId);
      if (success) {
        addDebugInfo(`Успешный вход под пользователем ${employeeName}`);
        toast({ title: "Вход выполнен", description: `Вы вошли как ${employeeName}` });
        navigate('/dashboard');
      } else {
        addDebugInfo(`Ошибка входа под пользователем ${employeeName}`);
        toast({ title: "Ошибка", description: "Не удалось войти как пользователь", variant: "destructive" });
      }
    } catch (error) {
      addDebugInfo(`Исключение при входе под пользователем: ${error}`);
      toast({ title: "Ошибка", description: "Не удалось войти как пользователь", variant: "destructive" });
    }
  }, [loginAsUser, navigate]);

  const handleManualRefresh = useCallback(() => {
    addDebugInfo('Ручное обновление данных...');
    refetch();
    toast({ title: "Обновление", description: "Данные обновлены" });
  }, [refetch]);

  if (!user || user.role !== 'admin') return null;

  if (isLoading && !employees) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>Загрузка данных...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent flex items-center">
              <Settings className="w-8 h-8 mr-3 text-blue-600" />Админ-панель (Диагностика)
            </h1>
            <p className="text-gray-600 mt-1">Управление сотрудниками и отладка API</p>
            {isFetching && (
              <p className="text-blue-600 text-sm mt-1 flex items-center">
                <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                Обновление данных...
              </p>
            )}
          </div>
          <div className="flex items-center space-x-2">
            {isAdminMode && (
              <Button onClick={() => { returnToAdmin(); navigate('/dashboard'); }} variant="outline" size="sm" className="border-purple-200 text-purple-600 hover:bg-purple-50">
                <ArrowLeft className="w-4 h-4 mr-2" />Вернуться к администратору
              </Button>
            )}
            <Button onClick={testApiEndpoints} variant="outline" size="sm" className="border-red-200 text-red-600 hover:bg-red-50">
              <Bug className="w-4 h-4 mr-2" />Тест API
            </Button>
            <Button onClick={handleManualRefresh} variant="outline" size="sm" className="border-blue-200 text-blue-600 hover:bg-blue-50" disabled={isFetching}>
              <RefreshCw className={`w-4 h-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
              Обновить
            </Button>
            <Button onClick={() => navigate('/dashboard')} variant="outline" className="border-blue-200 text-blue-600 hover:bg-blue-50">
              <ArrowLeft className="w-4 h-4 mr-2" />Назад к панели
            </Button>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6 mb-8">
          {/* Debug Panel */}
          <div className="lg:col-span-1">
            <Card className="bg-white/80 backdrop-blur-sm shadow-xl border-0">
              <CardHeader>
                <CardTitle className="text-lg font-bold text-gray-800 flex items-center">
                  <Bug className="w-5 h-5 mr-2" />
                  Отладочная информация
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="max-h-96 overflow-y-auto space-y-1">
                  {debugInfo.map((info, index) => (
                    <div key={index} className="text-xs font-mono bg-gray-100 p-2 rounded">
                      {info}
                    </div>
                  ))}
                  {debugInfo.length === 0 && (
                    <div className="text-gray-500 text-sm">Отладочная информация появится здесь</div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Статистика по сотрудникам */}
            {employees && employees.length > 0 && (
              <div className="grid md:grid-cols-4 gap-4 mb-6">
                <Card className="bg-gradient-to-r from-green-500 to-emerald-600 text-white border-0 shadow-xl">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-green-100 text-sm font-medium">На работе</p>
                        <p className="text-2xl font-bold">{employees.filter(e => e.status === 'working').length}</p>
                      </div>
                      <Users className="w-8 h-8 text-green-200" />
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-gradient-to-r from-orange-500 to-yellow-600 text-white border-0 shadow-xl">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-orange-100 text-sm font-medium">На перерыве</p>
                        <p className="text-2xl font-bold">{employees.filter(e => e.status === 'break').length}</p>
                      </div>
                      <Users className="w-8 h-8 text-orange-200" />
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-gradient-to-r from-gray-500 to-slate-600 text-white border-0 shadow-xl">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-100 text-sm font-medium">Не в сети</p>
                        <p className="text-2xl font-bold">{employees.filter(e => e.status === 'offline' || !e.status).length}</p>
                      </div>
                      <Users className="w-8 h-8 text-gray-200" />
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white border-0 shadow-xl">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-blue-100 text-sm font-medium">Всего</p>
                        <p className="text-2xl font-bold">{employees.length}</p>
                      </div>
                      <Users className="w-8 h-8 text-blue-200" />
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Таблица сотрудников */}
            <Card className="bg-white/80 backdrop-blur-sm shadow-xl border-0">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="text-xl font-bold text-gray-800">
                    Список сотрудников ({employees?.length || 0})
                  </CardTitle>
                  <div className="text-sm text-gray-500">
                    Автообновление каждые 10 секунд
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {error && (
                  <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-red-700 font-medium">Ошибка загрузки данных:</p>
                    <p className="text-red-600 text-sm">{error instanceof Error ? error.message : String(error)}</p>
                  </div>
                )}

                {employees && employees.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Сотрудник</TableHead>
                        <TableHead>Статус</TableHead>
                        <TableHead>Время на перерыве</TableHead>
                        <TableHead>Роль</TableHead>
                        <TableHead className="text-right">Действия</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {employees.map((employee) => (
                        <TableRow key={employee.id} className="hover:bg-blue-50/50">
                          <TableCell>
                            <div>
                              <div className="font-medium text-gray-900">{employee.name}</div>
                              <div className="text-sm text-gray-500">{employee.email}</div>
                              <div className="text-xs text-gray-400">ID: {employee.id}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col space-y-1">
                              {getStatusBadge(employee.status || 'offline')}
                              <div className="text-xs text-gray-500">
                                Raw: {employee.status || 'undefined'}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            {employee.status === 'break' && employee.breakStartTime
                              ? getBreakDuration(employee.breakStartTime)
                              : <span className="text-gray-400">—</span>}
                          </TableCell>
                          <TableCell>
                            <Badge variant={employee.role === 'admin' ? 'default' : 'secondary'}>
                              {employee.role === 'admin' ? 'Админ' : 'Пользователь'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end space-x-2">
                              <UserDialog 
                                user={{ 
                                  id: employee.id.toString(), 
                                  name: employee.name, 
                                  email: employee.email, 
                                  role: employee.role, 
                                  status: employee.status || 'offline', 
                                  breakStartTime: employee.breakStartTime 
                                }} 
                                onSave={(userData) => handleUpdateUser(userData, employee.id)} 
                              />
                              <Button 
                                size="sm" 
                                variant="outline" 
                                onClick={() => handleLoginAsUser(employee.id.toString(), employee.name)} 
                                className="border-green-200 text-green-600 hover:bg-green-50"
                                disabled={isFetching}
                              >
                                <LogIn className="w-4 h-4" />
                              </Button>
                              {employee.id !== user.id && (
                                <>
                                  <Button 
                                    size="sm" 
                                    variant="outline" 
                                    onClick={() => testDeleteUser(employee.id)}
                                    className="border-yellow-200 text-yellow-600 hover:bg-yellow-50"
                                    disabled={isFetching}
                                  >
                                    Test
                                  </Button>
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button 
                                        size="sm" 
                                        variant="outline" 
                                        className="border-red-200 text-red-600 hover:bg-red-50" 
                                        disabled={deleteUserMutation.isPending || isFetching}
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>Удалить пользователя?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          Вы действительно хотите удалить пользователя {employee.name}? Это действие нельзя отменить.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>Отмена</AlertDialogCancel>
                                        <AlertDialogAction 
                                          onClick={() => handleDeleteUser(employee.id, employee.name)} 
                                          className="bg-red-600 hover:bg-red-700"
                                          disabled={deleteUserMutation.isPending}
                                        >
                                          {deleteUserMutation.isPending ? 'Удаление...' : 'Удалить'}
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                </>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-500">Нет данных о сотрудниках</p>
                    <p className="text-sm text-gray-400 mt-2">
                      {isFetching ? 'Загрузка данных...' : 'Попробуйте обновить данные'}
                    </p>
                    <Button onClick={handleManualRefresh} className="mt-4" disabled={isFetching}>
                      {isFetching ? (
                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Загрузка...</>
                      ) : (
                        'Обновить данные'
                      )}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;
