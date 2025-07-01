
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FileText, Loader2, Calendar } from 'lucide-react';
import { useGetAllLogs } from '../hooks/useSupabaseAdmin';

const AdminLogsDialog = () => {
  const [open, setOpen] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  const { data: logs, isLoading, error, refetch } = useGetAllLogs(startDate, endDate);

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('ru-RU');
  };

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'start_work':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Начало работы</Badge>;
      case 'start_break':
        return <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100">Начало перерыва</Badge>;
      case 'end_break':
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Конец перерыва</Badge>;
      case 'end_work':
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Конец работы</Badge>;
      default:
        return <Badge variant="secondary">{action}</Badge>;
    }
  };

  const getBreakDurationText = (action: string, breakDuration?: number) => {
    if (action === 'end_break' && breakDuration) {
      const minutes = Math.floor(breakDuration / 60);
      return `Длительность: ${minutes} мин`;
    }
    return '—';
  };

  const handleFilterByDay = () => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    setStartDate(todayStr);
    setEndDate(todayStr);
  };

  const handleFilterByMonth = () => {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    
    setStartDate(firstDay.toISOString().split('T')[0]);
    setEndDate(lastDay.toISOString().split('T')[0]);
  };

  const handleClearFilter = () => {
    setStartDate('');
    setEndDate('');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="border-purple-200 text-purple-600 hover:bg-purple-50"
        >
          <FileText className="w-4 h-4 mr-2" />
          Все логи
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-6xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Логи пользователей</DialogTitle>
        </DialogHeader>
        
        {/* Фильтры */}
        <div className="flex flex-wrap gap-4 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center space-x-2">
            <Label htmlFor="startDate">С:</Label>
            <Input
              id="startDate"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-auto"
            />
          </div>
          <div className="flex items-center space-x-2">
            <Label htmlFor="endDate">По:</Label>
            <Input
              id="endDate"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-auto"
            />
          </div>
          <div className="flex space-x-2">
            <Button size="sm" onClick={handleFilterByDay} variant="outline">
              <Calendar className="w-4 h-4 mr-1" />
              Сегодня
            </Button>
            <Button size="sm" onClick={handleFilterByMonth} variant="outline">
              <Calendar className="w-4 h-4 mr-1" />
              Текущий месяц
            </Button>
            <Button size="sm" onClick={handleClearFilter} variant="outline">
              Сбросить
            </Button>
            <Button size="sm" onClick={() => refetch()} variant="outline">
              Обновить
            </Button>
          </div>
        </div>
        
        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin mr-2" />
            <span>Загрузка логов...</span>
          </div>
        )}
        
        {error && (
          <div className="text-center py-8 text-red-600">
            Ошибка загрузки логов
          </div>
        )}
        
        {logs && logs.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            Логи не найдены за выбранный период
          </div>
        )}
        
        {logs && logs.length > 0 && (
          <div className="space-y-4">
            <div className="text-sm text-gray-600">
              Найдено записей: {logs.length}
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Дата и время</TableHead>
                  <TableHead>Пользователь</TableHead>
                  <TableHead>Действие</TableHead>
                  <TableHead>Детали</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>{formatDate(log.timestamp)}</TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{log.user.name}</div>
                        <div className="text-sm text-gray-500">{log.user.email}</div>
                      </div>
                    </TableCell>
                    <TableCell>{getActionBadge(log.action)}</TableCell>
                    <TableCell className="text-gray-600">
                      {getBreakDurationText(log.action, log.break_duration)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default AdminLogsDialog;
