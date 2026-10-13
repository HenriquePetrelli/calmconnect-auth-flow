import { useEffect, useRef, useState } from 'react';
import { Loader2, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import SafetyPlanListsForm from '@/components/safety/SafetyPlanListsForm';
import { useToast } from '@/hooks/use-toast';
import { emptySafetyPlan, type SafetyPlanLists } from '@/lib/safetyPlan';
import {
  DEFAULT_POST_CRISIS_TITLE,
  countPlanItems,
  fetchPostCrisisPlan,
  savePostCrisisPlan,
  type PostCrisisSourceType,
} from '@/lib/postCrisisPlan';
import { getFriendlyErrorMessage } from '@/utils/errorMessage';

/**
 * Psicólogo: plano pós-crise do atendimento. Fica montado durante a chamada,
 * então fechar e abrir de novo não perde o que foi escrito.
 */
const PostCrisisPlanDialog = ({
  open,
  onOpenChange,
  sourceType,
  sourceId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sourceType: PostCrisisSourceType;
  sourceId: string;
}) => {
  const { toast } = useToast();
  const [title, setTitle] = useState('');
  const [lists, setLists] = useState<SafetyPlanLists>(emptySafetyPlan());
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [locked, setLocked] = useState(false);
  const [savedOnce, setSavedOnce] = useState(false);

  // Carrega uma vez, na primeira abertura. Depois o que está na tela vale.
  const requested = useRef(false);
  useEffect(() => {
    if (!open || requested.current) return;
    requested.current = true;
    setLoading(true);
    fetchPostCrisisPlan(sourceType, sourceId)
      .then((plan) => {
        if (!plan) return;
        setTitle(plan.title);
        setLists(plan.lists);
        setLocked(!plan.editable);
        setSavedOnce(true);
      })
      // Sem plano anterior legível: começa em branco.
      .catch(() => {})
      .finally(() => {
        setLoaded(true);
        setLoading(false);
      });
  }, [open, sourceType, sourceId]);

  const items = countPlanItems(lists);

  const handleSave = async () => {
    setSaving(true);
    try {
      await savePostCrisisPlan(sourceType, sourceId, title, lists);
      setSavedOnce(true);
      toast({
        title: 'Plano salvo',
        description: 'O paciente recebe ao fim do atendimento, ou agora, se ele já terminou.',
      });
      onOpenChange(false);
    } catch (error) {
      toast({ title: 'Não foi possível salvar o plano', description: getFriendlyErrorMessage(error, 'O que você escreveu continua na tela. Tente de novo em instantes.'), variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <div className="mb-1 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <ShieldCheck className="h-5 w-5 text-primary" aria-hidden="true" />
          </div>
          <DialogTitle>Plano pós-crise</DialogTitle>
          <DialogDescription>
            Monte com o paciente um plano de segurança com o que vocês conversaram. Escreva como ele vai ler, com as
            palavras dele. Ele recebe ao fim do atendimento e decide se salva nos planos dele.
          </DialogDescription>
        </DialogHeader>

        {loading || !loaded ? (
          <div className="flex justify-center py-8" aria-label="Carregando">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : locked ? (
          <p className="rounded-lg border bg-muted/40 p-3 text-sm text-foreground">
            O plano já foi entregue ao paciente e não pode mais ser alterado.
          </p>
        ) : (
          <SafetyPlanListsForm
            idPrefix="pos-crise"
            title={title}
            titlePlaceholder={DEFAULT_POST_CRISIS_TITLE}
            onTitleChange={setTitle}
            lists={lists}
            onListsChange={setLists}
          />
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {locked ? 'Fechar' : 'Voltar à chamada'}
          </Button>
          {!locked && (
            <Button onClick={handleSave} disabled={saving || loading || !loaded || items === 0}>
              {saving ? 'Salvando...' : savedOnce ? 'Salvar alterações' : 'Salvar plano'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PostCrisisPlanDialog;
