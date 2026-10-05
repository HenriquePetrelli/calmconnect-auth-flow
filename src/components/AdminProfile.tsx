import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ThemeToggle } from '@/components/ThemeToggle';
import { PushNotificationToggle } from '@/components/PushNotificationToggle';
import { SettingsRow, SettingsSection } from '@/components/settings/SettingsList';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { BellRing, Loader2, LogOut, Palette, Shield } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { getFriendlyErrorMessage } from '@/utils/errorMessage';
import { passwordProblem } from '@/lib/password';

const AdminProfile = () => {
  const { toast } = useToast();
  const { signOut, user } = useAuth();
  
  const [isUpdating, setIsUpdating] = useState(false);
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const handleLogout = async () => {
    try {
      toast({ title: "Logout realizado" });
      await signOut();
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdating(true);

    try {
      // Validate passwords
      if (formData.newPassword) {
        if (formData.newPassword !== formData.confirmPassword) {
          throw new Error('As senhas não coincidem');
        }
        const weakPassword = passwordProblem(formData.newPassword);
        if (weakPassword) {
          throw new Error(weakPassword);
        }
        if (!formData.currentPassword) {
          throw new Error('Senha atual é obrigatória para alterar a senha');
        }
      }

      // Only update if there are changes
      if (!formData.newPassword) {
        toast({
          title: "Nenhuma alteração",
          description: "Não há alterações para salvar.",
        });
        return;
      }

      // Confirm the caller actually knows the current password before
      // changing it — the field above only checked it was non-empty, so
      // any live admin session (a stolen token, an unlocked shared
      // computer) could change the password and lock the real admin out
      // without ever proving they know the current one. This is the
      // highest-privilege account in the app, so it gets checked first.
      if (!user?.email) throw new Error('Não foi possível confirmar o email da conta');
      const { error: reauthError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: formData.currentPassword,
      });
      if (reauthError) throw new Error('Senha atual incorreta');

      // Update password in Supabase Auth
      const { error } = await supabase.auth.updateUser({
        password: formData.newPassword
      });

      if (error) throw error;

      toast({ title: "Senha atualizada" });

      // Clear password fields
      setFormData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });

    } catch (error) {
      toast({
        title: "Erro ao atualizar",
        description: getFriendlyErrorMessage(error, "Não foi possível atualizar o perfil."),
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const email = user?.email ?? '';

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      {/* Quem é */}
      <Card className="border-border/60">
        <div className="flex items-center gap-4 p-5">
          <div
            className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-xl font-semibold text-primary"
            aria-hidden="true"
          >
            {(email || 'A').charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-lg font-semibold text-foreground">{email}</p>
            <Badge variant="secondary" className="mt-2 gap-1.5 font-medium">
              <Shield className="h-3 w-3 text-primary" aria-hidden="true" /> Administrador
            </Badge>
          </div>
        </div>
      </Card>

      <section className="space-y-2" aria-label="Senha">
        <h2 className="px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Senha</h2>
        <Card className="border-border/60">
          <CardContent className="p-4">
            <p className="mb-4 text-xs text-muted-foreground">Para trocar, confirme a senha atual.</p>
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="currentPassword">Senha atual</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  autoComplete="current-password"
                  value={formData.currentPassword}
                  onChange={(e) => setFormData((prev) => ({ ...prev, currentPassword: e.target.value }))}
                  placeholder="••••••••"
                  disabled={isUpdating}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="newPassword">Nova senha</Label>
                <Input
                  id="newPassword"
                  type="password"
                  autoComplete="new-password"
                  value={formData.newPassword}
                  onChange={(e) => setFormData((prev) => ({ ...prev, newPassword: e.target.value }))}
                  placeholder="••••••••"
                  disabled={isUpdating}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="confirmPassword">Confirmar nova senha</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                  placeholder="••••••••"
                  disabled={isUpdating}
                />
              </div>
              <Button type="submit" disabled={isUpdating} className="h-11 w-full">
                {isUpdating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  'Trocar senha'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </section>

      <SettingsSection title="Preferências">
        <SettingsRow icon={<Palette />} title="Tema" description="Claro, escuro ou do sistema" trailing={<ThemeToggle />} />
        <PushNotificationToggle icon={<BellRing />} />
      </SettingsSection>

      <Card className="overflow-hidden border-border/60">
        <SettingsRow icon={<LogOut />} title="Sair da conta" description="Encerrar a sessão neste aparelho" onClick={handleLogout} tone="destructive" />
      </Card>
    </div>
  );
};

export default AdminProfile;