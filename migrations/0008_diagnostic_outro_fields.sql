-- Novos campos "Outro (qual?)" no diagnóstico Skin Call
ALTER TABLE diagnostics ADD COLUMN alimentacao_outro text;
ALTER TABLE diagnostics ADD COLUMN ambiente_fatores_outro text;
ALTER TABLE diagnostics ADD COLUMN pele_acordar_outro text;
ALTER TABLE diagnostics ADD COLUMN pele_2h_outro text;
ALTER TABLE diagnostics ADD COLUMN pele_tarde_outro text;
ALTER TABLE diagnostics ADD COLUMN pele_textura_outro text;
ALTER TABLE diagnostics ADD COLUMN pele_cor_outro text;
ALTER TABLE diagnostics ADD COLUMN pele_toque_outro text;
ALTER TABLE diagnostics ADD COLUMN pele_ambiente_outro text;
ALTER TABLE diagnostics ADD COLUMN pele_borbulhas_outro text;
ALTER TABLE diagnostics ADD COLUMN pele_firmeza_outro text;
ALTER TABLE diagnostics ADD COLUMN rotina_lavar_rosto_outro text;
