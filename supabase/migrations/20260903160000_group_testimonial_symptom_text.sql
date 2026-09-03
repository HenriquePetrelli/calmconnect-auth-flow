-- group_testimonials.sintoma_id references transtornos_sintomas(id), which
-- is a GROUP-level row holding an array of symptom strings (sintomas
-- text[]) — not one row per symptom. The testimonial form let patients pick
-- an individual symptom from that array, but had no column capable of
-- storing WHICH symptom was chosen: every option in the dropdown saved the
-- same sintoma_id (the group's row id), and the testimonial card always
-- displayed sintomas[0], the first symptom in the group's list, regardless
-- of what the patient actually selected.
--
-- Add a column to store the selected symptom's text directly.

ALTER TABLE public.group_testimonials ADD COLUMN IF NOT EXISTS sintoma_texto text;
