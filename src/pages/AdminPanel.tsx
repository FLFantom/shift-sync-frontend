import { useAuth } from '../contexts/AuthContext';
import { useGetAllUsers, useUpdateUser, useDeleteUser } from '../hooks/useAdminApi';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Users, Settings, ArrowLeft, Trash2, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import UserDialog from '../components/UserDialog';
import UserLogsDialog from '../components/UserLogsDialog';

const AdminPanel = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const { data: employees, isLoading, error } = useGetAllUsers();
  const updateUserMutation = useUpdateUser();
  const deleteUserMutation = useDeleteUser();

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'working':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">На месте</Badge>;
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
        {hours > 0 ? `${hours}ч ` : ''}{minutes}м
        {isOvertime ? ' (превышение!)' : ''}
      </span>
    );
  };

  const handleUpdateUser = (userData: { name: string; email: string; role: 'user' | 'admin' }, userId: number) => {
    updateUserMutation.mutate({
      userId,
      data: { name: userData.name, role: userData.role }
    });
  };

  const handleDeleteUser = (employeeId: number) => {
    deleteUserMutation.mutate(employeeId);
  };

  if (!user || user.role !== 'admin') {
    return null;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>Загрузка данных...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-bold text-red-600 mb-2">Ошибка загрузки</h2>
          <p className="text-gray-600">Не удалось загрузить данные сотрудников</p>
          <p className="text-sm text-gray-500 mt-2">
            {error instanceof Error ? error.message : 'Неизвестная ошибка'}
          </p>
        </div>
      </div>
    );
  }

  console.log('Employees data in component:', employees);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent flex items-center">
              <Settings className="w-8 h-8 mr-3 text-blue-600" />
              Админ-панель
            </h1>
            <p className="text-gray-600 mt-1">
              Управление сотрудниками и учет рабочего времени
            </p>
          </div>
          
          <Button
            onClick={() => navigate('/dashboard')}
            variant="outline"
            className="border-blue-200 text-blue-600 hover:bg-blue-50"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Назад к панели
          </Button>
        </div>

        {/* Statistics Cards */}
        {employees && employees.length > 0 && (
          <div className="grid md:grid-cols-4 gap-6 mb-8">
            <Card className="bg-gradient-to-r from-green-500 to-emerald-600 text-white border-0 shadow-xl">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-green-100 text-sm font-medium">На работе</p>
                    <p className="text-3xl font-bold">
                      {employees.filter(e => e.status === 'working').length}
                    </p>
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
                    <p className="text-3xl font-bold">
                      {employees.filter(e => e.status === 'break').length}
                    </p>
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
                    <p className="text-3xl font-bold">
                      {employees.filter(e => e.status === 'offline' || !e.status).length}
                    </p>
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

        {/* Employees Table */}
        <Card className="bg-white/80 backdrop-blur-sm shadow-xl border-0">
          <CardHeader>
            <CardTitle className="text-xl font-bold text-gray-800">
              Список сотрудников ({employees?.length || 0})
            </CardTitle>
          </CardHeader>
          <CardContent>
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
                          <div className="font-medium text-gray-900">
                            {employee.name || 'Неизвестный пользователь'}
                          </div>
                          <div className="text-sm text-gray-500">{employee.email}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(employee.status || 'offline')}
                      </TableCell>
                      <TableCell>
                        {employee.status === 'break' && employee.breakStartTime
                          ? getBreakDuration(employee.breakStartTime)
                          : <span className="text-gray-400">—</span>
                        }
                      </TableCell>
                      <TableCell>
                        <Badge variant={employee.role === 'admin' ? 'default' : 'secondary'}>
                          {employee.role === 'admin' ? 'Админ' : 'Пользователь'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <UserLogsDialog 
                            userId={employee.id}
                            userName={employee.name || 'Неизвестный пользователь'}
                          />
                          <UserDialog 
                            user={{
                              id: employee.id.toString(),
                              name: employee.name || 'Неизвестный пользователь',
                              email: employee.email,
                              role: employee.role,
                              status: employee.status || 'offline',
                              breakStartTime: employee.breakStartTime
                            }}
                            onSave={(userData) => handleUpdateUser(userData, employee.id)}
                          />
                          {employee.id !== user.id && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="border-red-200 text-red-600 hover:bg-red-50"
                                  disabled={deleteUserMutation.isPending}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Удалить пользователя?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Вы действительно хотите удалить пользователя {employee.name || employee.email}? 
                                    Это действие нельзя отменить.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Отмена</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDeleteUser(employee.id)}
                                    className="bg-red-600 hover:bg-red-700"
                                  >
                                    Удалить
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
                  Проверьте подключение к серверу или обратитесь к администратору
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminPanel;
