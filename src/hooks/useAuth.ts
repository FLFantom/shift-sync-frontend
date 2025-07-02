
import { useMutation } from '@tanstack/react-query';
import { apiClient, LoginRequest } from '@/lib/api';
import { toast } from '@/hooks/use-toast';

export const useLogin = () => {
  return useMutation({
    mutationFn: (data: LoginRequest) => apiClient.login(data),
    onError: (error) => {
      toast({
        title: "Ошибка входа",
        description: error.message || "Произошла ошибка при входе",
        variant: "destructive",
      });
    }
  });
};
