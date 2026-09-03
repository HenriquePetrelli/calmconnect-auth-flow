CREATE OR REPLACE FUNCTION public.initialize_patient_achievements(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.patient_achievements (user_id, title, description, icon)
  VALUES
    (p_user_id, 'Primeiro Passo', 'Complete sua primeira prática de respiração guiada', 'undraw_meditation'),
    (p_user_id, 'Respirador Experiente', 'Complete 5 sessões de respiração guiada', 'undraw_yoga'),
    (p_user_id, 'Escritor Consciente', 'Registre 7 entradas no seu diário privado', 'undraw_note_list'),
    (p_user_id, 'Comprometido com a Terapia', 'Complete 3 consultas agendadas', 'undraw_chat'),
    (p_user_id, 'Mestre do Humor', 'Registre seu humor por 7 dias consecutivos', 'undraw_profile_data'),
    (p_user_id, 'Cuidado Constante', 'Use o aplicativo por 30 dias consecutivos', 'undraw_celebration'),
    (p_user_id, 'Primeiro Som', 'Complete sua primeira sessão de sons terapêuticos', 'undraw_music'),
    (p_user_id, 'Ouvinte Dedicado', 'Complete 5 sessões de sons terapêuticos', 'undraw_headphones')
  ON CONFLICT (user_id, title) DO NOTHING;
END;
$$;