-- Registro de token de push que sobrevive à troca de usuário no aparelho.
--
-- O token do FCM identifica o APARELHO, não a pessoa. Quando outra pessoa
-- entra no mesmo celular, o upsert por `token` bate na linha do usuário
-- anterior, e a RLS (UPDATE só na própria linha) barra a troca de dono — o
-- novo usuário não conseguia ativar o push. Esta função passa o token para
-- quem está logado agora; quem tem o token é quem está com o aparelho.
CREATE OR REPLACE FUNCTION public.register_push_token(p_token text, p_device_info jsonb DEFAULT '{}'::jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;
  IF p_token IS NULL OR length(p_token) < 20 OR length(p_token) > 4096 THEN
    RAISE EXCEPTION 'Token inválido';
  END IF;

  INSERT INTO public.fcm_tokens (user_id, token, device_info, is_active, updated_at)
  VALUES (auth.uid(), p_token, COALESCE(p_device_info, '{}'::jsonb), true, now())
  ON CONFLICT (token) DO UPDATE
  SET user_id = auth.uid(),
      device_info = EXCLUDED.device_info,
      is_active = true,
      updated_at = now();
END;
$$;

REVOKE ALL ON FUNCTION public.register_push_token(text, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.register_push_token(text, jsonb) TO authenticated;