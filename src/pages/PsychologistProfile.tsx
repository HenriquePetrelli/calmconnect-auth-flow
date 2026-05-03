import { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { LogOut, Mail, Lock, User, FileText, Pencil, Check, MessageCircle } from 'lucide-react';
import BackButton from '@/components/BackButton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SPECIALIZATIONS } from '@/data/specializations';
import { PasswordChangeModal } from '@/components/psychologist/PasswordChangeModal';
import { useNavigate } from 'react-router-dom';

const PsychologistProfile = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  // Account
  const [email, setEmail] = useState('');
  const [tempEmail, setTempEmail] = useState('');
  const [pendingEmail, setPendingEmail] = useState(false);
  const pollRef = useRef<number | null>(null);

  // Password modal
  const [pwdOpen, setPwdOpen] = useState(false);

  // Professional profile
  const [fullName, setFullName] = useState('');
  const [specialization, setSpecialization] = useState('');
  const [bio, setBio] = useState('');

  // Inline edit states
  const [editName, setEditName] = useState(false);
  const [editSpec, setEditSpec] = useState(false);
  const [editBio, setEditBio] = useState(false);
  const [editEmail, setEditEmail] = useState(false);

  // Temp values for editing
  const [tempName, setTempName] = useState('');
  const [tempSpec, setTempSpec] = useState('');
  const [tempBio, setTempBio] = useState('');

  useEffect(() => {
    document.title = 'Perfil do Psicólogo | Soliv';
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        setUserId(user.id);
        setEmail(user.email || '');
        setTempEmail(user.email || '');

        const { data: psych } = await supabase
          .from('psychologists')
          .select('full_name, specialization, bio, email')
          .eq('user_id', user.id)
          .maybeSingle();

        if (psych) {
          setFullName(psych.full_name || '');
          setTempName(psych.full_name || '');
          setSpecialization(psych.specialization || '');
          setTempSpec(psych.specialization || '');
          setBio(psych.bio || '');
          setTempBio(psych.bio || '');
        }
      } finally {
        setLoading(false);
      }
    };
    load();

    return () => {
      if (pollRef.current) window.clearInterval(pollRef.current);
    };
  }, []);

  const updatePsych = async (values: Record<string, any>) => {
    if (!userId) return;
    const { error } = await supabase.from('psychologists').update(values as any).eq('user_id', userId);
    if (error) throw error;
  };

  const handleSaveName = async () => {
    try {
      await updatePsych({ full_name: tempName.trim() });
      await supabase.from('profiles').update({ full_name: tempName.trim() }).eq('user_id', userId!);
      setFullName(tempName.trim());
      setEditName(false);
      toast({ title: 'Salvo', description: 'Nome atualizado com sucesso.' });
    } catch (e: any) {
      toast({ title: 'Erro ao salvar', description: e.message || 'Tente novamente', variant: 'destructive' });
    }
  };

  const handleSaveSpec = async () => {
    try {
      await updatePsych({ specialization: tempSpec });
      await supabase.from('profiles').update({ specialty: tempSpec }).eq('user_id', userId!);
      setSpecialization(tempSpec);
      setEditSpec(false);
      toast({ title: 'Salvo', description: 'Especialização atualizada.' });
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message || 'Tente novamente', variant: 'destructive' });
    }
  };

  const handleSaveBio = async () => {
    try {
      await updatePsych({ bio: tempBio.trim() });
      setBio(tempBio.trim());
      setEditBio(false);
      toast({ title: 'Salvo', description: 'Biografia atualizada.' });
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message || 'Tente novamente', variant: 'destructive' });
    }
  };

  const handleEmailSave = async () => {
    if (!tempEmail || tempEmail === email) { setEditEmail(false); return; }
    try {
      const { error } = await supabase.auth.updateUser({ email: tempEmail });
      if (error) throw error;
      setPendingEmail(true);
      setEditEmail(false);
      toast({ title: 'Confirmação enviada', description: 'Verifique seu email para confirmar a alteração.' });

      if (pollRef.current) window.clearInterval(pollRef.current);
      pollRef.current = window.setInterval(async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.email === tempEmail) {
          try {
            await updatePsych({ email: tempEmail });
          } catch {}
          setEmail(tempEmail);
          setPendingEmail(false);
          if (pollRef.current) window.clearInterval(pollRef.current);
        }
      }, 8000);
    } catch (e: any) {
      toast({ title: 'Erro ao atualizar email', description: e.message || 'Verifique o endereço informado.', variant: 'destructive' });
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut({ scope: 'global' });
      window.location.href = '/';
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
        <div className="flex items-center gap-2">
          <BackButton to="/psychologist-dashboard" label="Voltar" />
          <h1 className="text-2xl font-semibold">Perfil do Psicólogo</h1>
        </div>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><User className="w-4 h-4" /> Informações da Conta</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Email */}
          <div>
            <label className="text-sm text-muted-foreground">Email</label>
            <div className="flex gap-2 mt-1 items-center">
              <Mail className="w-4 h-4 text-muted-foreground" />
              <Input type="email" value={tempEmail} onChange={(e) => setTempEmail(e.target.value)} disabled={!editEmail} />
              {editEmail ? (
                <Button size="sm" onClick={handleEmailSave} className="shrink-0"><Check className="w-4 h-4 mr-1" />Salvar</Button>
              ) : (
                <Button size="sm" variant="ghost" onClick={() => setEditEmail(true)} className="shrink-0"><Pencil className="w-4 h-4" /></Button>
              )}
            </div>
            {pendingEmail && (
              <p className="text-xs text-muted-foreground mt-1">Confirmação pendente. Verifique sua caixa de entrada.</p>
            )}
          </div>

          {/* Password */}
          <div className="flex items-end justify-between gap-4">
            <div className="flex-1">
              <label className="text-sm text-muted-foreground">Senha</label>
              <div className="flex gap-2 mt-1 items-center">
                <Lock className="w-4 h-4 text-muted-foreground" />
                <Input type="password" value="********" disabled className="select-none" />
              </div>
            </div>
            <Button onClick={() => setPwdOpen(true)} className="shrink-0">Alterar Senha</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><FileText className="w-4 h-4" /> Perfil Profissional</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Nome completo */}
          <div>
            <label className="text-sm text-muted-foreground">Nome completo</label>
            <div className="flex gap-2 mt-1 items-center">
              <Input value={tempName} onChange={(e) => setTempName(e.target.value)} disabled={!editName} />
              {editName ? (
                <Button size="sm" onClick={handleSaveName} className="shrink-0"><Check className="w-4 h-4 mr-1" />Salvar</Button>
              ) : (
                <Button size="sm" variant="ghost" onClick={() => setEditName(true)} className="shrink-0"><Pencil className="w-4 h-4" /></Button>
              )}
            </div>
          </div>

          {/* Especialização */}
          <div>
            <label className="text-sm text-muted-foreground">Especialização</label>
            <div className="flex gap-2 mt-1 items-center">
              {editSpec ? (
                <Select value={tempSpec} onValueChange={setTempSpec}>
                  <SelectTrigger className="min-w-[260px]"><SelectValue placeholder="Selecione sua especialização" /></SelectTrigger>
                  <SelectContent>
                    {SPECIALIZATIONS.map((spec) => (
                      <SelectItem key={spec} value={spec}>{spec}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input value={specialization || ''} disabled />
              )}
              {editSpec ? (
                <Button size="sm" onClick={handleSaveSpec} className="shrink-0"><Check className="w-4 h-4 mr-1" />Salvar</Button>
              ) : (
                <Button size="sm" variant="ghost" onClick={() => setEditSpec(true)} className="shrink-0"><Pencil className="w-4 h-4" /></Button>
              )}
            </div>
          </div>

          {/* Biografia */}
          <div>
            <label className="text-sm text-muted-foreground">Biografia</label>
            <div className="flex gap-2 mt-1 items-start">
              <Textarea className="min-h-[120px]" value={tempBio} onChange={(e) => setTempBio(e.target.value)} disabled={!editBio} />
              {editBio ? (
                <Button size="sm" onClick={handleSaveBio} className="shrink-0 mt-1"><Check className="w-4 h-4 mr-1" />Salvar</Button>
              ) : (
                <Button size="sm" variant="ghost" onClick={() => setEditBio(true)} className="shrink-0 mt-1"><Pencil className="w-4 h-4" /></Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6 space-y-3">
          <Button 
            variant="outline" 
            className="w-full justify-start" 
            onClick={() => navigate('/psicologo/suporte')}
          >
            <MessageCircle size={16} className="mr-2" />
            Suporte
          </Button>
          
          <Button 
            variant="destructive" 
            className="w-full justify-start" 
            onClick={handleLogout}
          >
            <LogOut size={16} className="mr-2" />
            Sair da Conta
          </Button>
        </CardContent>
      </Card>

      <PasswordChangeModal open={pwdOpen} onOpenChange={setPwdOpen} currentEmail={email} />
    </div>
  );
};

export default PsychologistProfile;
