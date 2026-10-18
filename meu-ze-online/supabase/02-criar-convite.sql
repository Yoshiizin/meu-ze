-- Troque SOMENTE a frase entre aspas depois de v_code := e execute no SQL Editor.
-- O código deve ter entre 20 e 120 caracteres; use uma combinação difícil de adivinhar.
DO $$
DECLARE v_code text := 'TROQUE-ESTE-CODIGO-ANTES-DE-EXECUTAR';
BEGIN
  IF v_code = 'TROQUE-ESTE-CODIGO-ANTES-DE-EXECUTAR' OR length(v_code)<20 OR length(v_code)>120 THEN
    RAISE EXCEPTION 'Antes de executar, escolha um codigo secreto entre 20 e 120 caracteres.';
  END IF;
  INSERT INTO private.access_codes (code,active)
  VALUES (v_code,true)
  ON CONFLICT (code) DO UPDATE SET active = true;
END;
$$;

-- Para desativar convite antigo sem expulsar quem já entrou:
-- update private.access_codes set active=false where code='CODIGO-ANTIGO';
-- Para remover alguém, delete seu user_id na tabela public.members pelo painel Supabase.
