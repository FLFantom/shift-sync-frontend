
import { useMutation } from '@tanstack/react-query';
import { apiClient, TimeActionRequest, LatenessReportRequest, BreakExceededRequest } from '@/lib/api';
import { toast } from '@/hooks/use-toast';

export const useTimeAction = () => {
  return useMutation({
    mutationFn: (data: TimeActionRequest) => apiClient.timeAction(data),
    onError: (error) => {
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
    mutationFn: (data: LatenessReportRequest) => apiClient.reportLateness(data),
    onError: (error) => {
      console.error('Lateness report error:', error);
    }
  });
};

export const useNotifyBreakExceeded = () => {
  return useMutation({
    mutationFn: (data: BreakExceededRequest) => apiClient.notifyBreakExceeded(data),
    onError: (error) => {
      console.error('Break exceeded notification error:', error);
    }
  });
};
