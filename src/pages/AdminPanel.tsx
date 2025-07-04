
import { useAuth } from '../contexts/AuthContext';
import { useGetAllUsers, useUpdateUser, useDeleteUser } from '../hooks/useSupabaseAdmin';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Users, Settings, ArrowLeft, Trash2, Loader2, LogIn, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import UserDialog from '../components/UserDialog';
import UserLogsDialog from '../components/UserLogsDialog';
import AdminLogsDialog from '../components/AdminLogsDialog';
import ResetPasswordDialog from '../components/ResetPasswordDialog';
import React, { useCallback } from 'react';
import { toast } from '@/hooks/use-toast';

const AdminPanel = () => {
  const { user, loginAsUser, isAdminMode, returnToAdmin } = useAuth();
  const navigate = useNavigate();

  const { data: employees, isLoading, error, refetch, isFetching } = useGetAllUsers();
  const updateUserMutation = useUpdateUser();
  const deleteUserMutation = useDeleteUser();

  // Первоначальная загрузка при монтировании компонента
  React.useEffect(() => {
    refetch();
  }, [refetch]);

const getStatusBadge = (status: string) => {
    const normalized = status.toLowerCase();
    if (['working', 'work', 'active', 'online'].includes(normalized)) {
      return (
        <Badge className="bg-green-100 text-green-800 hover:bg-green-100">На работе</Badge>
      );
    }
    if (['break', 'on_break', 'pause'].includes(normalized)) {
      return (
        <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100">На перерыве</Badge>
      );
    }
    return <Badge variant="secondary">Не в сети</Badge>;
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
    updateUserMutation.mutate({ userId, data: { name: userData.name, role: userData.role } }, {
      onSuccess: () => {
        // Обновляем данные после успешного изменения
        refetch();
        toast({
          title: "Успешно",
          description: "Данные пользователя обновлены",
        });
      }
    });
  }, [updateUserMutation, refetch]);

  const handleDeleteUser = useCallback((employeeId: number, employeeName: string) => {
    deleteUserMutation.mutate(employeeId, {
      onSuccess: () => {
        toast({ title: "Удаление", description: `Пользователь ${employeeName} удален`, variant: "destructive" });
        // Обновляем данные после удаления
        refetch();
      },
      onError: (error: any) => {
        console.error('Ошибка удаления:', error);
        toast({ title: "Ошибка", description: `Не удалось удалить пользователя: ${error.message || 'Неизвестная ошибка'}`, variant: "destructive" });
      }
    });
  }, [deleteUserMutation, refetch]);

  const handleLoginAsUser = useCallback(async (employeeId: string, employeeName: string) => {
    try {
      const success = await loginAsUser(employeeId);
      if (success) {
        toast({ title: "Вход выполнен", description: `Вы вошли как ${employeeName}` });
        navigate('/dashboard');
      } else {
        toast({ title: "Ошибка", description: "Не удалось войти как пользователь", variant: "destructive" });
      }
    } catch (error) {
      console.error('Ошибка входа под пользователем:', error);
      toast({ title: "Ошибка", description: "Не удалось войти как пользователь", variant: "destructive" });
    }
  }, [loginAsUser, navigate]);

  const handleManualRefresh = useCallback(() => {
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

  if (error && !employees) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-bold text-red-600 mb-2">Ошибка загрузки</h2>
          <p className="text-gray-600">Не удалось загрузить данные сотрудников</p>
          <p className="text-sm text-gray-500 mt-2">{error instanceof Error ? error.message : 'Неизвестная ошибка'}</p>
          <Button onClick={() => refetch()} className="mt-4">Попробовать снова</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent flex items-center">
              <Settings className="w-8 h-8 mr-3 text-blue-600" />Админ-панель
            </h1>
            <p className="text-gray-600 mt-1">Управление сотрудниками и учет рабочего времени</p>
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
            <AdminLogsDialog />
            <Button 
              onClick={handleManualRefresh} 
              variant="outline" 
              size="sm" 
              className="border-blue-200 text-blue-600 hover:bg-blue-50"
              disabled={isFetching}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
              Обновить
            </Button>
            <Button onClick={() => navigate('/dashboard')} variant="outline" className="border-blue-200 text-blue-600 hover:bg-blue-50">
              <ArrowLeft className="w-4 h-4 mr-2" />Назад к панели
            </Button>
          </div>
        </div>

        {/* Статистика по сотрудникам */}
        {employees && employees.length > 0 && (
          <div className="grid md:grid-cols-4 gap-6 mb-8">
            <Card className="bg-gradient-to-r from-green-500 to-emerald-600 text-white border-0 shadow-xl">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-green-100 text-sm font-medium">На работе</p>
                    <p className="text-3xl font-bold">{employees.filter(e => e.status?.toLowerCase() === 'working').length}</p>
                  </div>
                  <Users className="w-12 h-12 text-green-200" />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-r from-orange-500 to-yellow-600 text-white border-0 shadow-xl">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-orange-100 text-sm font-medium">На перерыве</p>
                    <p className="text-3xl font-bold">{employees.filter(e => e.status?.toLowerCase() === 'break').length}</p>
                  </div>
                  <Users className="w-12 h-12 text-orange-200" />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-r from-gray-500 to-slate-600 text-white border-0 shadow-xl">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-100 text-sm font-medium">Не в сети</p>
                    <p className="text-3xl font-bold">{employees.filter(e => !e.status || e.status.toLowerCase() === 'offline').length}</p>
                  </div>
                  <Users className="w-12 h-12 text-gray-200" />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white border-0 shadow-xl">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-100 text-sm font-medium">Всего</p>
                    <p className="text-3xl font-bold">{employees.length}</p>
                  </div>
                  <Users className="w-12 h-12 text-blue-200" />
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
                Ручное обновление по кнопке
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-700 font-medium">Ошибка:</p>
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
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(employee.status || 'offline')}</TableCell>
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
                          <UserLogsDialog userId={employee.id} userName={employee.name} />
                          <ResetPasswordDialog userId={employee.id} userName={employee.name} />
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
                  {isFetching ? 'Загрузка данных...' : 'Нажмите "Обновить" для загрузки данных'}
                </p>
                <Button 
                  onClick={handleManualRefresh} 
                  className="mt-4"
                  disabled={isFetching}
                >
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
  );
};

export default AdminPanel;
