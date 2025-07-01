
import { useMutation } from '@tanstack/react-query';
import { supabaseApiClient, LoginRequest, RegisterRequest } from '@/lib/supabaseApi';

export const useLogin = () => {
  return useMutation({
    mutationFn: (data: LoginRequest) => supabaseApiClient.login(data),
  });
};

export const useRegister = () => {
  return useMutation({
    mutationFn: (data: RegisterRequest) => supabaseApiClient.register(data),
  });
};

export const useChangePassword = () => {
  return useMutation({
    mutationFn: ({ userId, currentPassword, newPassword }: { 
      userId: number; 
      currentPassword: string; 
      newPassword: string; 
    }) => supabaseApiClient.changePassword(userId, currentPassword, newPassword),
  });
};
