
import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Users, Settings, ArrowLeft, LogIn, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';
import UserDialog from '../components/UserDialog';

interface Employee {
  id: string;
  name: string;
  email: string;
  status: 'working' | 'break' | 'offline';
  breakStartTime?: string;
  role: 'user' | 'admin';
}

const AdminPanel = () => {
  const { user, loginAsUser, getAllUsers, updateUser, deleteUser, addUser } = useAuth();
  const navigate = useNavigate();
  const [employees, setEmployees] = useState<Employee[]>([]);

  useEffect(() => {
    if (user?.role === 'admin') {
      const users = getAllUsers();
      setEmployees(users);
    }
  }, [user, getAllUsers]);

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

  const handleLoginAsUser = (employeeId: string, employeeName: string) => {
    const success = loginAsUser(employeeId);
    if (success) {
      toast({
        title: "Вход выполнен",
        description: `Вы вошли как ${employeeName}`,
      });
      navigate('/dashboard');
    } else {
      toast({
        title: "Ошибка",
        description: "Не удалось войти как пользователь",
        variant: "destructive",
      });
    }
  };

  const handleEditUser = (userData: Omit<Employee, 'id' | 'status'>, userId: string) => {
    const success = updateUser(userId, userData);
    if (success) {
      toast({
        title: "Успешно",
        description: `Данные пользователя ${userData.name} обновлены`,
      });
      // Refresh employees list
      const users = getAllUsers();
      setEmployees(users);
    } else {
      toast({
        title: "Ошибка",
        description: "Не удалось обновить данные пользователя",
        variant: "destructive",
      });
    }
  };

  const handleDeleteUser = (employeeId: string, employeeName: string) => {
    const success = deleteUser(employeeId);
    if (success) {
      toast({
        title: "Удаление",
        description: `Пользователь ${employeeName} удален`,
        variant: "destructive",
      });
      // Refresh employees list
      const users = getAllUsers();
      setEmployees(users);
    } else {
      toast({
        title: "Ошибка",
        description: "Не удалось удалить пользователя",
        variant: "destructive",
      });
    }
  };

  const handleAddUser = (userData: Omit<Employee, 'id' | 'status'>) => {
    const success = addUser(userData);
    if (success) {
      toast({
        title: "Успешно",
        description: `Пользователь ${userData.name} добавлен`,
      });
      // Refresh employees list
      const users = getAllUsers();
      setEmployees(users);
    } else {
      toast({
        title: "Ошибка",
        description: "Не удалось добавить пользователя",
        variant: "destructive",
      });
    }
  };

  if (!user || user.role !== 'admin') {
    return null;
  }

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
                    {employees.filter(e => e.status === 'offline').length}
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

        {/* Employees Table */}
        <Card className="bg-white/80 backdrop-blur-sm shadow-xl border-0">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="text-xl font-bold text-gray-800">
                Список сотрудников
              </CardTitle>
              <UserDialog onSave={handleAddUser} />
            </div>
          </CardHeader>
          <CardContent>
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
                    <TableCell>
                      {getStatusBadge(employee.status)}
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
                        {employee.role !== 'admin' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleLoginAsUser(employee.id, employee.name)}
                            className="border-blue-200 text-blue-600 hover:bg-blue-50"
                          >
                            <LogIn className="w-4 h-4" />
                          </Button>
                        )}
                        <UserDialog 
                          user={employee}
                          onSave={(userData) => handleEditUser(userData, employee.id)}
                        />
                        {employee.id !== user.id && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-red-200 text-red-600 hover:bg-red-50"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Удалить пользователя?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Вы действительно хотите удалить пользователя {employee.name}? 
                                  Это действие нельзя отменить.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Отмена</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteUser(employee.id, employee.name)}
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
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminPanel;
