
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { toast } from '@/hooks/use-toast';

export const useGetAllUsers = () => {
  return useQuery({
    queryKey: ['admin', 'users'],
    queryFn: () => apiClient.getAllUsers(),
    refetchInterval: 30000, // Обновляем каждые 30 секунд
  });
};

export const useUpdateUser = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ userId, data }: { userId: string; data: { name: string; role: string } }) => 
      apiClient.updateUser(userId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      toast({
        title: "Успешно",
        description: "Данные пользователя обновлены",
      });
    },
    onError: (error) => {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось обновить данные пользователя",
        variant: "destructive",
      });
    }
  });
};

export const useDeleteUser = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (userId: string) => apiClient.deleteUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      toast({
        title: "Удаление",
        description: "Пользователь удален",
        variant: "destructive",
      });
    },
    onError: (error) => {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось удалить пользователя",
        variant: "destructive",
      });
    }
  });
};

export const useGetUserLogs = (userId: string) => {
  return useQuery({
    queryKey: ['admin', 'user', userId, 'logs'],
    queryFn: () => apiClient.getUserLogs(userId),
    enabled: !!userId,
  });
};
