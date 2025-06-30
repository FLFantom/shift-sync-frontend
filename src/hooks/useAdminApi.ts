import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { toast } from '@/hooks/use-toast';

export const useGetAllUsers = () => {
  return useQuery({
    queryKey: ['admin', 'users'],
    queryFn: () => apiClient.getAllUsers(),
    refetchInterval: 10000, // Автообновление каждые 10 секунд
    refetchOnWindowFocus: true, // Обновление при фокусе на окне
    refetchOnReconnect: true, // Обновление при восстановлении соединения
    staleTime: 5000, // Данные считаются свежими 5 секунд
    retry: 3, // Повторять запрос 3 раза при ошибке
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Экспоненциальная задержка
  });
};

export const useUpdateUser = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ userId, data }: { userId: number; data: { name: string; role: string } }) => 
      apiClient.updateUser(userId, data),
    onSuccess: () => {
      // Немедленно обновляем данные пользователей
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      toast({
        title: "Успешно",
        description: "Данные пользователя обновлены",
      });
    },
    onError: (error: any) => {
      console.error('Ошибка обновления пользователя:', error);
      toast({
        title: "Ошибка",
        description: error?.message || "Не удалось обновить данные пользователя",
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
      // Немедленно обновляем данные пользователей
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      // Toast уже обрабатывается в компоненте для большего контроля
    },
    onError: (error: any) => {
      console.error('Ошибка удаления пользователя:', error);
      toast({
        title: "Ошибка",
        description: error?.message || "Не удалось удалить пользователя",
        variant: "destructive",
      });
    }
  });
};

export const useGetUserLogs = (userId: number) => {
  return useQuery({
    queryKey: ['admin', 'user', userId, 'logs'],
    queryFn: () => apiClient.getUserLogs(userId),
    enabled: !!userId,
    refetchOnWindowFocus: false, // Логи не нужно часто обновлять
    staleTime: 30000, // Логи остаются свежими 30 секунд
  });
};
