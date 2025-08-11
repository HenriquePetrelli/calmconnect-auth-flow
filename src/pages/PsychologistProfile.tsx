import { useEffect, useMemo, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { LogOut, Mail, Lock, User, FileText } from 'lucide-react';

const DEBOUNCE_MS = 600;

const PsychologistProfile = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  // Account
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Professional profile
  const [fullName, setFullName] = useState('');
  const [specialization, setSpecialization] = useState('');
  const [bio, setBio] = useState('');

  const debounceRef = useRef<number | null>(null);
  const canSaveProfile = useMemo(() => fullName.trim().length > 1, [fullName]);

  useEffect(() => {
    document.title = 'Perfil do Psicólogo | CalmConnect';
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        setUserId(user.id);
        setEmail(user.email || '');

        // Load psychologist profile
        const { data: psych } = await supabase
          .from('psychologists')
          .select('full_name, specialization, bio, email')
          .eq('user_id', user.id)
          .maybeSingle();

        if (psych) {
          setFullName(psych.full_name || '');
          setSpecialization(psych.specialization || '');
          setBio(psych.bio || '');
          if (psych.email) setEmail(psych.email);
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const scheduleSave = () => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(saveProfile, DEBOUNCE_MS);
  };

  const saveProfile = async () => {
    if (!userId || !canSaveProfile) return;
    try {
      setSaving(true);
      const { error } = await supabase
        .from('psychologists')
        .update({ full_name: fullName.trim(), specialization: specialization.trim(), bio: bio.trim(), email })
        .eq('user_id', userId);

      if (error) throw error;

      // Keep profiles table in sync for specialty and name
      await supabase
        .from('profiles')
        .update({ full_name: fullName.trim(), specialty: specialization.trim() })
        .eq('user_id', userId);

      toast({ title: 'Salvo', description: 'Perfil atualizado com sucesso.' });
    } catch (e: any) {
      toast({ title: 'Erro ao salvar', description: e.message || 'Tente novamente', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleEmailBlur = async () => {
    if (!email || !userId) return;
    try {
      const { error } = await supabase.auth.updateUser({ email });
      if (error) throw error;
      toast({ title: 'Email atualizado', description: 'Confirme a alteração pelo link enviado ao email.' });

      // Reflect in psychologists table
      await supabase.from('psychologists').update({ email }).eq('user_id', userId);
    } catch (e: any) {
      toast({ title: 'Erro ao atualizar email', description: e.message || 'Verifique o endereço informado.', variant: 'destructive' });
    }
  };

  const handleChangePassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      toast({ title: 'Senha inválida', description: 'A senha deve ter pelo menos 6 caracteres.', variant: 'destructive' });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: 'As senhas não coincidem', description: 'Verifique e tente novamente.', variant: 'destructive' });
      return;
    }
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setNewPassword('');
      setConfirmPassword('');
      toast({ title: 'Senha atualizada', description: 'Sua senha foi alterada com sucesso.' });
    } catch (e: any) {
      toast({ title: 'Erro ao alterar senha', description: e.message || 'Tente novamente.', variant: 'destructive' });
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut({ scope: 'global' });
      window.location.href = '/psychologist-login';
    } catch { }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando perfil...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Perfil do Psicólogo</h1>
        <Button variant="outline" onClick={handleLogout}>
          <LogOut className="w-4 h-4 mr-2" /> Sair da Conta
        </Button>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><User className="w-4 h-4" /> Informações da Conta</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm text-muted-foreground">Email</label>
            <div className="flex gap-2 mt-1">
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} onBlur={handleEmailBlur} />
              <Mail className="w-4 h-4 mt-3 text-muted-foreground" />
            </div>
            <p className="text-xs text-muted-foreground mt-1">A alteração envia um link de confirmação para o novo email.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-1">
              <label className="text-sm text-muted-foreground">Nova senha</label>
              <div className="flex gap-2 mt-1">
                <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
                <Lock className="w-4 h-4 mt-3 text-muted-foreground" />
              </div>
            </div>
            <div className="md:col-span-1">
              <label className="text-sm text-muted-foreground">Confirmar senha</label>
              <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
            </div>
            <div className="md:col-span-1 flex items-end">
              <Button onClick={handleChangePassword} className="w-full">Atualizar Senha</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><FileText className="w-4 h-4" /> Perfil Profissional</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm text-muted-foreground">Nome completo</label>
            <Input value={fullName} onChange={(e) => { setFullName(e.target.value); scheduleSave(); }} />
          </div>
          <div>
            <label className="text-sm text-muted-foreground">Especialização</label>
            <Input value={specialization} onChange={(e) => { setSpecialization(e.target.value); scheduleSave(); }} />
          </div>
          <div>
            <label className="text-sm text-muted-foreground">Biografia</label>
            <Textarea className="min-h-[120px]" value={bio} onChange={(e) => { setBio(e.target.value); scheduleSave(); }} />
            <p className="text-xs text-muted-foreground mt-1">As alterações são salvas automaticamente.</p>
          </div>
          {saving && <p className="text-xs text-muted-foreground">Salvando...</p>}
        </CardContent>
      </Card>
    </div>
  );
};

export default PsychologistProfile;
