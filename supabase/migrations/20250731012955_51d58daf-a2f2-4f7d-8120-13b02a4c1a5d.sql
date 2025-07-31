-- Inserir um psicólogo de teste para verificar o sistema
DO $$
DECLARE
    test_user_id uuid := '11111111-1111-1111-1111-111111111111';
BEGIN
    -- Inserir psicólogo de teste apenas se não existir
    IF NOT EXISTS (SELECT 1 FROM public.psychologists WHERE email = 'psicologo.teste@email.com') THEN
        INSERT INTO public.psychologists (
            id,
            user_id,
            full_name,
            email,
            crp_number,
            specialization,
            bio,
            approval_status,
            submitted_at
        ) VALUES (
            gen_random_uuid(),
            test_user_id,
            'Dr. João Silva',
            'psicologo.teste@email.com',
            '12/345678',
            'Psicologia Clínica',
            'Psicólogo clínico com 10 anos de experiência em terapia cognitivo-comportamental. Especialista em transtornos de ansiedade e depressão.',
            'pending',
            NOW()
        );
    END IF;
END $$;