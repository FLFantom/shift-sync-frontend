
import { useMutation } from '@tanstack/react-query';
import { apiClient, LoginRequest } from '@/lib/api';

export const useLogin = () => {
  return useMutation({
    mutationFn: (data: LoginRequest) => apiClient.login(data),
  });
};
