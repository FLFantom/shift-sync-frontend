
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { FileText, Loader2 } from 'lucide-react';
import { useGetUserLogs } from '../hooks/useAdminApi';

interface UserLogsDialogProps {
  userId: string;
  userName: string;
}

const UserLogsDialog = ({ userId, userName }: UserLogsDialogProps) => {
  const [open, setOpen] = useState(false);
  const { data: logs, isLoading, error } = useGetUserLogs(open ? userId : '');

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

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          variant="outline"
          className="border-blue-200 text-blue-600 hover:bg-blue-50"
        >
          <FileText className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Логи пользователя: {userName}</DialogTitle>
        </DialogHeader>
        
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
            Логи не найдены
          </div>
        )}
        
        {logs && logs.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Дата и время</TableHead>
                <TableHead>Действие</TableHead>
                <TableHead>Детали</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell>{formatDate(log.timestamp)}</TableCell>
                  <TableCell>{getActionBadge(log.action)}</TableCell>
                  <TableCell className="text-gray-600">
                    {log.details || '—'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default UserLogsDialog;
