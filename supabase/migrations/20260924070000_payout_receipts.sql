-- Comprovante e conciliação do repasse ao psicólogo.
--
-- O admin confirmava o PIX de repasse com um clique, sem registrar nada que
-- permitisse conferir depois (o psicólogo não via histórico nenhum, e um
-- clique duplo ou um valor que mudou no meio do caminho não eram
-- detectados). confirm-payment passa a exigir o código E2E do PIX e o valor
-- que o admin viu; o comprovante (opcional) fica num bucket privado.

INSERT INTO storage.buckets (id, name, public)
VALUES ('payment-receipts', 'payment-receipts', false)
ON CONFLICT (id) DO UPDATE SET public = false;

-- Caminho: <psychologists.id>/<arquivo> (mesmo id usado em psychologist_payments)
CREATE POLICY "Admins manage payout receipts"
  ON storage.objects FOR ALL
  TO authenticated
  USING (bucket_id = 'payment-receipts' AND public.is_super_admin())
  WITH CHECK (bucket_id = 'payment-receipts' AND public.is_super_admin());

CREATE POLICY "Psychologists read their own payout receipts"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'payment-receipts'
    AND (storage.foldername(name))[1] IN (SELECT p.id::text FROM public.psychologists p WHERE p.user_id = auth.uid())
  );

-- O psicólogo passa a ver o histórico dos próprios repasses.
CREATE POLICY "Psychologists view their own payment logs"
  ON public.payment_logs FOR SELECT
  TO authenticated
  USING (psychologist_id IN (SELECT p.id FROM public.psychologists p WHERE p.user_id = auth.uid()));
