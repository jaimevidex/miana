-- Migration 0004: Simplificar 10 estados para 4.
-- novo → novo
-- orcamento_enviado, aguarda_resposta, em_analise, proposta_enviada → pendente
-- aceite, em_curso, concluido → aceite
-- recusado, desativo → eliminado

UPDATE leads SET status = 'pendente' WHERE status IN ('orcamento_enviado', 'aguarda_resposta', 'em_analise', 'proposta_enviada');
UPDATE leads SET status = 'aceite' WHERE status IN ('em_curso', 'concluido');
UPDATE leads SET status = 'eliminado' WHERE status IN ('recusado', 'desativo');
