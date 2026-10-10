-- Contas: cadastro do paciente numa operação só (varredura de funcionamento).
--
-- Antes o app criava o login e, em seguida, gravava os dados do paciente
-- (CPF, cidade, telefone, sintomas) com uma segunda chamada. Problemas:
--   - com "Confirmar e-mail" ligado no Supabase (item das pendências de
--     lançamento) não há sessão logo após o cadastro, a segunda chamada era
--     recusada e a conta ficava sem os dados do paciente;
--   - CPF já usado (ou qualquer falha nessa segunda chamada) deixava um login
--     criado sem cadastro, e tentar de novo dava "e-mail já cadastrado".
-- Agora o banco cria a linha do paciente junto com o login, a partir dos dados
-- enviados no cadastro; se o CPF já existe, nada é criado. Depois de copiados,
-- CPF, telefone e endereço saem dos metadados do login (que vão dentro do
-- token de acesso).

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  meta jsonb := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);
  v_cpf text;
BEGIN
  INSERT INTO public.profiles (user_id, user_type, full_name, crp)
  VALUES (
    NEW.id,
    CASE WHEN meta ->> 'user_type' = 'psychologist'
      THEN 'psychologist' ELSE 'patient' END::public.user_type,
    COALESCE(meta ->> 'full_name', ''),
    meta ->> 'crp'
  );

  -- Paciente com os dados do cadastro: cria a linha junto com o login.
  v_cpf := NULLIF(regexp_replace(COALESCE(meta ->> 'cpf', ''), '\D', '', 'g'), '');
  IF COALESCE(meta ->> 'user_type', 'patient') <> 'psychologist' AND v_cpf IS NOT NULL THEN
    IF EXISTS (SELECT 1 FROM public.patients WHERE cpf = v_cpf) THEN
      RAISE EXCEPTION 'CPF já cadastrado' USING ERRCODE = '23505';
    END IF;
    INSERT INTO public.patients (user_id, full_name, email, cpf, state, city, phone, sintomas_selecionados)
    VALUES (
      NEW.id,
      COALESCE(NULLIF(btrim(meta ->> 'full_name'), ''), split_part(NEW.email, '@', 1)),
      NEW.email,
      v_cpf,
      COALESCE(NULLIF(btrim(meta ->> 'state'), ''), ''),
      COALESCE(NULLIF(btrim(meta ->> 'city'), ''), ''),
      NULLIF(regexp_replace(COALESCE(meta ->> 'phone', ''), '\D', '', 'g'), ''),
      COALESCE(
        (SELECT array_agg(value) FROM jsonb_array_elements_text(
           CASE WHEN jsonb_typeof(meta -> 'sintomas') = 'array' THEN meta -> 'sintomas' ELSE '[]'::jsonb END
         ) AS value),
        ARRAY[]::text[]
      )
    );

    -- Dados pessoais não ficam nos metadados do login (vão no token).
    UPDATE auth.users
    SET raw_user_meta_data = raw_user_meta_data - 'cpf' - 'phone' - 'state' - 'city' - 'sintomas'
    WHERE id = NEW.id;
  END IF;

  RETURN NEW;
END;
$function$;

-- Uma linha de paciente por conta.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.patients WHERE user_id IS NOT NULL GROUP BY user_id HAVING count(*) > 1
  ) THEN
    CREATE UNIQUE INDEX IF NOT EXISTS patients_user_id_unique ON public.patients (user_id);
  END IF;
END $$;
