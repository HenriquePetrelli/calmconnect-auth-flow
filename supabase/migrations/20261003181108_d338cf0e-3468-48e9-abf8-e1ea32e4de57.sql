REVOKE ALL ON public.sos_followups_sent FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.sos_followups_sent TO service_role;
CREATE POLICY "Somente o sistema acessa acompanhamentos de SOS" ON public.sos_followups_sent
  FOR ALL TO service_role USING (true) WITH CHECK (true);

REVOKE ALL ON public.payout_items FROM PUBLIC, anon;
GRANT SELECT ON public.payout_items TO authenticated;
GRANT ALL ON public.payout_items TO service_role;