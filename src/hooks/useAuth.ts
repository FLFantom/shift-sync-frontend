
import { useMutation } from '@tanstack/react-query';
import { apiClient, LoginRequest, RegisterRequest } from '@/lib/api';

export const useLogin = () => {
  return useMutation({
    mutationFn: (data: LoginRequest) => apiClient.login(data),
  });
};

export const useRegister = () => {
  return useMutation({
    mutationFn: (data: RegisterRequest) => apiClient.register(data),
  });
};
