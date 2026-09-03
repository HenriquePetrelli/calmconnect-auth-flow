-- patient_statistics already tracks total_therapeutic_sound_time (minutes
-- listened to therapeutic sounds, updated via update_patient_activity_time)
-- but no achievement ever checked it — only total_guided_breathing_time
-- counted toward unlocking anything. A patient who only uses the sound
-- library, never breathing exercises, could never unlock "Primeiro Passo"
-- or "Respirador Experiente" even though they engage with the app just as
-- much. Add a sound-listening pair mirroring the existing breathing pair.

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
