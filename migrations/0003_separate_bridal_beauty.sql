-- Migration 0003: Separar bridal-beauty em bridal e beauty.
-- Leads com opcao_servico = 'Bride' → bridal
-- Leads com opcao_servico != 'Bride' (ou sem) → beauty

-- Leads
UPDATE leads
SET type = 'bridal'
WHERE type = 'bridal-beauty'
  AND json_extract(form_data, '$.opcao_servico') = 'Bride';

UPDATE leads
SET type = 'beauty'
WHERE type = 'bridal-beauty'
  AND (json_extract(form_data, '$.opcao_servico') != 'Bride'
       OR json_extract(form_data, '$.opcao_servico') IS NULL);

-- Clients
UPDATE clients
SET type = 'bridal'
WHERE type = 'bridal-beauty'
  AND json_extract(data, '$.opcao_servico') = 'Bride';

UPDATE clients
SET type = 'beauty'
WHERE type = 'bridal-beauty'
  AND (json_extract(data, '$.opcao_servico') != 'Bride'
       OR json_extract(data, '$.opcao_servico') IS NULL);
