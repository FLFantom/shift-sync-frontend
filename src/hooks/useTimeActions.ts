
import { useMutation } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { toast } from '@/hooks/use-toast';

// Обновленный интерфейс без userId (он извлекается из JWT токена)
export interface TimeActionRequest {
  action: 'start_work' | 'start_break' | 'end_break' | 'end_work';
  breakDuration?: number;
}

export const useTimeAction = () => {
  return useMutation({
    mutationFn: (data: TimeActionRequest) => apiClient.timeAction(data),
    onError: (error) => {
      console.error('Time action error:', error);
      toast({
        title: "Ошибка",
        description: error.message || "Произошла ошибка при выполнении действия",
        variant: "destructive",
      });
    }
  });
};

export const useReportLateness = () => {
  return useMutation({
    mutationFn: (data: { userId: number; userName: string; userEmail: string; startTime: string; lateMinutes: number }) => 
      apiClient.reportLateness(data),
    onError: (error) => {
      console.error('Lateness report error:', error);
    }
  });
};

export const useNotifyBreakExceeded = () => {
  return useMutation({
    mutationFn: (data: { userId: number; userName: string; userEmail: string; breakDurationMinutes: number }) => 
      apiClient.notifyBreakExceeded(data),
    onError: (error) => {
      console.error('Break exceeded notification error:', error);
    }
  });
};
