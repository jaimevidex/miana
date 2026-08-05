# IMAGENS — Inventário e Regras

## Antes de começar
- [ ] Confirmar com a cliente que tem direitos/autorização (incluindo RGPD, se houver clientes reais identificáveis) para todas as imagens.
- [ ] Pedir sempre o ficheiro **original**, nunca a versão já comprimida do Instagram (perde qualidade irreversivelmente).
- [ ] Definir nome de ficheiro consistente: `categoria-cliente-numero.ext` (ex: `noiva-joana-01.jpg`).

## Inventário

| Ficheiro original | Categoria | Onde é usada | Dimensão original | Licença/autorização | Alt text (PT) | Estado |
|---|---|---|---|---|---|---|
| _exemplo:_ noiva-joana-01.jpg | Noivas | Portfólio, Home destaque | 4032×5376 | ✅ autorizado | "Maquilhagem de noiva com acabamento natural, tons rosados" | 🔴 pendente |
| | | | | | | |

(Duplicar linha por cada imagem recebida.)

## Categorias sugeridas
- Noivas
- Editorial / Moda
- Dia-a-dia
- Eventos
- Antes/Depois

## Pipeline técnico de otimização

1. Receber originais em alta resolução (idealmente ≥2400px no lado maior).
2. Cortar/enquadrar mantendo proporção 4:5 (retrato) ou 1:1 (quadrado) — evitar 16:9.
3. Passar por `astro:assets` (`<Image />`) ou script `sharp` para gerar:
   - WebP (principal) + fallback JPEG
   - Larguras responsivas: 400 / 800 / 1200 / 1800px
   - Qualidade: q80
4. Nome final: kebab-case, sem espaços/acentos (`noiva-joana-01.webp`).
5. Alt text sempre escrito à mão, descritivo (não decorativo/genérico).

## Checklist de qualidade antes do deploy
- [ ] Nenhuma imagem acima de 300KB na versão servida.
- [ ] Todas têm alt text.
- [ ] Lighthouse Performance ≥ 90 em mobile.
- [ ] Testar carregamento em rede 4G simulada (DevTools throttling).
