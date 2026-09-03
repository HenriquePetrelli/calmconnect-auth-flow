-- Achievement titles were hardcoded in English ('First Step', 'Deep
-- Breather', etc.) while every other user-facing string in the app is in
-- Portuguese. Translate the seed data produced by
-- initialize_patient_achievements for new users, and backfill existing
-- rows already sitting in production with the old English titles so
-- currently-unlocked achievements don't regress or duplicate.

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
    (p_user_id, 'Cuidado Constante', 'Use o aplicativo por 30 dias consecutivos', 'undraw_celebration')
  ON CONFLICT (user_id, title) DO NOTHING;
END;
$$;

-- Backfill: rename existing English-titled rows to their Portuguese
-- equivalent. ON CONFLICT is not needed here since no user could already
-- have both the English and Portuguese title for the same achievement.
UPDATE public.patient_achievements SET title = 'Primeiro Passo' WHERE title = 'First Step';
UPDATE public.patient_achievements SET title = 'Respirador Experiente' WHERE title = 'Deep Breather';
UPDATE public.patient_achievements SET title = 'Escritor Consciente' WHERE title = 'Mindful Writer';
UPDATE public.patient_achievements SET title = 'Comprometido com a Terapia' WHERE title = 'Therapy Follower';
UPDATE public.patient_achievements SET title = 'Mestre do Humor' WHERE title = 'Mood Tracker Pro';
UPDATE public.patient_achievements SET title = 'Cuidado Constante' WHERE title = 'Consistent Care';
