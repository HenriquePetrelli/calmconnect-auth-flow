-- Conquistas das funcionalidades novas (hábitos, remédio, largar hábitos,
-- desafios de 7 dias, metas da semana, questionários, comer com atenção e
-- padrões). initialize_patient_achievements é chamada sempre que o paciente
-- abre as conquistas, então quem já tem conta recebe as novas (bloqueadas)
-- automaticamente; ON CONFLICT mantém as que já existem.
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
    (p_user_id, 'Ouvinte Dedicado', 'Complete 5 sessões de sons terapêuticos', 'undraw_headphones'),
    (p_user_id, 'Novo Hábito', 'Comece seu primeiro hábito em Meus hábitos', 'habit_first'),
    (p_user_id, 'Uma Semana no Ritmo', 'Cumpra a meta de um hábito do dia por 7 dias seguidos', 'habit_streak'),
    (p_user_id, 'Remédio em Dia', 'Marque todas as doses do remédio por 7 dias seguidos', 'habit_medication'),
    (p_user_id, 'Uma Semana Sem', 'Fique 7 dias sem o hábito que você está largando', 'habit_quit_week'),
    (p_user_id, 'Um Mês Sem', 'Fique 30 dias sem o hábito que você está largando', 'habit_quit_month'),
    (p_user_id, 'Desafio Concluído', 'Complete os 7 passos de um desafio de 7 dias', 'challenge_done'),
    (p_user_id, 'Semana Completa', 'Conclua todas as metas de uma semana', 'weekly_all'),
    (p_user_id, 'Autoconhecimento', 'Responda os questionários de ansiedade e de humor', 'screening_both'),
    (p_user_id, 'Comer com Atenção', 'Faça o exercício de comer com atenção', 'mindful_eating'),
    (p_user_id, 'Seus Padrões', 'Descubra o primeiro padrão entre o seu humor e os seus hábitos', 'insight_first')
  ON CONFLICT (user_id, title) DO NOTHING;
END;
$$;

REVOKE ALL ON FUNCTION public.initialize_patient_achievements(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.initialize_patient_achievements(uuid) TO authenticated;
