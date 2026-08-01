import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Pencil } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { AdminPatient } from '@/hooks/usePatientManagement';

interface EditPatientModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patient: AdminPatient | null;
  onSaved: (updated?: AdminPatient) => void;
}

export const EditPatientModal = ({ open, onOpenChange, patient, onSaved }: EditPatientModalProps) => {
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    cpf: '',
    phone: '',
    state: '',
    city: '',
    password: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (patient && open) {
      setForm({
        full_name: patient.full_name || '',
        email: patient.email || '',
        cpf: patient.cpf || '',
        phone: patient.phone || '',
        state: patient.state || '',
        city: patient.city || '',
        password: '',
      });
    }
  }, [patient, open]);

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const submit = async () => {
    if (!patient) return;
    if (form.full_name.trim().length < 2) return toast.error('Informe o nome completo');
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email.trim())) return toast.error('E-mail inválido');
    if (form.password && form.password.length < 6) return toast.error('A senha deve ter ao menos 6 caracteres');

    setSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-update-patient', {
        body: {
          patient_id: patient.id,
          full_name: form.full_name,
          email: form.email,
          cpf: form.cpf,
          phone: form.phone,
          state: form.state,
          city: form.city,
          password: form.password || undefined,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(data?.warning || data?.message || 'Paciente atualizado');
      onOpenChange(false);
      onSaved(data?.data);
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao atualizar paciente');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-4 w-4" />
            Editar paciente
          </DialogTitle>
          <DialogDescription>Atualize os dados cadastrais e o acesso do paciente.</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2 sm:col-span-2">
            <Label>Nome completo</Label>
            <Input value={form.full_name} onChange={set('full_name')} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>E-mail</Label>
            <Input type="email" value={form.email} onChange={set('email')} />
          </div>
          <div className="space-y-2">
            <Label>CPF</Label>
            <Input value={form.cpf} onChange={set('cpf')} />
          </div>
          <div className="space-y-2">
            <Label>Telefone</Label>
            <Input value={form.phone} onChange={set('phone')} />
          </div>
          <div className="space-y-2">
            <Label>Estado</Label>
            <Input value={form.state} onChange={set('state')} />
          </div>
          <div className="space-y-2">
            <Label>Cidade</Label>
            <Input value={form.city} onChange={set('city')} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Nova senha (opcional)</Label>
            <Input
              type="password"
              value={form.password}
              onChange={set('password')}
              placeholder="Deixe em branco para manter a atual"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={saving}>
            {saving ? 'Salvando...' : 'Salvar alterações'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
