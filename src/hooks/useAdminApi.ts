import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { toast } from '@/hooks/use-toast';

export const useGetAllUsers = () => {
  return useQuery({
    queryKey: ['admin', 'users'],
    queryFn: () => apiClient.getAllUsers(),
    // УБРАНО: refetchInterval, refetchOnWindowFocus, refetchOnReconnect
    // Только ручное обновление по кнопке или при изменениях
    refetchOnWindowFocus: false,
    refetchOnReconnect: false, 
    refetchInterval: false,
    staleTime: 60000, // Данные считаются свежими 1 минуту
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
};

export const useUpdateUser = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ userId, data }: { userId: number; data: { name: string; role: string } }) => 
      apiClient.updateUser(userId, data),
    onSuccess: () => {
      // Немедленно обновляем данные пользователей после изменения
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      // Toast обрабатывается в компоненте для большего контроля
    },
     onError: (error: unknown) => {
      console.error('Ошибка обновления пользователя:', error);
      const message = (error as Error)?.message ?? 'Не удалось обновить данные пользователя';
      toast({
        title: "Ошибка",
        description: message,
        variant: "destructive",
      });
    }
  });
};

export const useDeleteUser = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (userId: number) => apiClient.deleteUser(userId),
    onSuccess: () => {
      // Немедленно обновляем данные пользователей после удаления
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      // Toast обрабатывается в компоненте для большего контроля
    },
    onError: (error: unknown) => {
      console.error('Ошибка удаления пользователя:', error);
      // Не показываем toast здесь, обрабатываем в компоненте
    }
  });
};

export const useGetUserLogs = (userId: number) => {
  return useQuery({
    queryKey: ['admin', 'user', userId, 'logs'],
    queryFn: () => apiClient.getUserLogs(userId),
    enabled: !!userId,
    refetchOnWindowFocus: false,
    staleTime: 30000,
  });
};
