
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RotateCcw, Eye, EyeOff } from 'lucide-react';
import { useResetPassword } from '@/hooks/useSupabaseAdmin';
import { toast } from '@/hooks/use-toast';

interface ResetPasswordDialogProps {
  userId: number;
  userName: string;
}

const ResetPasswordDialog = ({ userId, userName }: ResetPasswordDialogProps) => {
  const [open, setOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const resetPasswordMutation = useResetPassword();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      toast({
        title: "Ошибка",
        description: "Пароли не совпадают",
        variant: "destructive",
      });
      return;
    }

    if (newPassword.length < 3) {
      toast({
        title: "Ошибка",
        description: "Пароль должен содержать минимум 3 символа",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await resetPasswordMutation.mutateAsync({
        userId,
        newPassword,
      });

      if (response.success) {
        toast({
          title: "Успешно",
          description: `Пароль для пользователя ${userName} успешно сброшен`,
        });
        setOpen(false);
        setNewPassword('');
        setConfirmPassword('');
      } else {
        toast({
          title: "Ошибка",
          description: response.error || "Не удалось сбросить пароль",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Произошла ошибка при сбросе пароля",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="border-orange-200 text-orange-600 hover:bg-orange-50">
          <RotateCcw className="w-4 h-4 mr-2" />
          Сбросить пароль
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Сброс пароля для {userName}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="newPassword">Новый пароль</Label>
            <div className="relative">
              <Input
                id="newPassword"
                type={showNewPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowNewPassword(!showNewPassword)}
              >
                {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Подтвердите новый пароль</Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Отмена
            </Button>
            <Button type="submit" disabled={resetPasswordMutation.isPending}>
              {resetPasswordMutation.isPending ? "Сброс..." : "Сбросить пароль"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ResetPasswordDialog;
