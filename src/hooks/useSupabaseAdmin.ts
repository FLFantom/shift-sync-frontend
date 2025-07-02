
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabaseApiClient } from '@/lib/supabaseApi';
import { toast } from '@/hooks/use-toast';

export const useGetAllUsers = () => {
  return useQuery({
    queryKey: ['supabase', 'users'],
    queryFn: () => supabaseApiClient.getAllUsers(),
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchInterval: false,
    staleTime: 60000,
    retry: 3,
  });
};

export const useUpdateUser = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ userId, data }: { userId: number; data: { name: string; role: string } }) => 
      supabaseApiClient.updateUser(userId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supabase', 'users'] });
    },
    onError: (error: any) => {
      toast({
        title: "Ошибка",
        description: error.message || 'Не удалось обновить пользователя',
        variant: "destructive",
      });
    }
  });
};

export const useDeleteUser = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (userId: number) => supabaseApiClient.deleteUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supabase', 'users'] });
    },
  });
};

export const useGetUserLogs = (userId: number, startDate?: string, endDate?: string) => {
  return useQuery({
    queryKey: ['supabase', 'user-logs', userId, startDate, endDate],
    queryFn: () => supabaseApiClient.getUserLogs(userId, startDate, endDate),
    enabled: !!userId,
    refetchOnWindowFocus: false,
    staleTime: 30000,
  });
};

export const useGetAllLogs = (startDate?: string, endDate?: string) => {
  return useQuery({
    queryKey: ['supabase', 'all-logs', startDate, endDate],
    queryFn: () => supabaseApiClient.getAllLogs(startDate, endDate),
    refetchOnWindowFocus: false,
    staleTime: 30000,
  });
};

export const useResetPassword = () => {
  return useMutation({
    mutationFn: ({ userId, newPassword }: { userId: number; newPassword: string }) => 
      supabaseApiClient.resetPassword(userId, newPassword),
    onError: (error: any) => {
      toast({
        title: "Ошибка",
        description: error.message || 'Не удалось сбросить пароль',
        variant: "destructive",
      });
    }
  });
};
