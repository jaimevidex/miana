# DESIGN SYSTEM

> Direção visual proposta para o esqueleto (v0). Deve ser revista com a cliente depois do BRIEF preenchido — isto assume um posicionamento "editorial / atelier de maquilhagem", ajustar se o tom real for diferente (ex: mais jovem/colorido, ou mais clínico/minimal).

## Conceito

Em vez de um layout genérico de "beleza" (fundo creme + serif + terracota, que é o default que qualquer IA produz para este tipo de site), a direção aqui parte de um objeto real do mundo da maquilhagem: a **paleta de sombras / swatch card** — aquelas fitas de cor com o nome do pigmento por baixo. Isso vira o elemento assinatura (ver secção Layout).

## Cor

| Nome | Hex | Uso |
|---|---|---|
| Espresso | `#2B1F1C` | Fundo escuro (hero, footer, secções de destaque) |
| Poudre | `#F1E8E1` | Fundo claro (secções de conteúdo) |
| Vinho | `#7A2E3B` | Cor primária de ação (CTAs, links, hover) |
| Ouro Fosco | `#B8935A` | Acentos, divisores, detalhes finos |
| Argila | `#8C6F5E` | Texto secundário, bordas, legendas |
| Creme | `#F7F2EC` | Texto sobre fundo escuro |

Notas:
- Evitar preto puro (`#000`) e branco puro (`#FFF`) — usar sempre Espresso/Creme.
- Vinho é a cor de conversão (botões, links ativos) — usar com moderação para manter impacto.
- Ouro Fosco só em traços finos (1–2px) ou pequenos detalhes, nunca em áreas grandes.

## Tipografia

| Papel | Fonte | Uso |
|---|---|---|
| Display | **Fraunces** (variable, optical size alto, itálico em destaques) | Títulos, headline do hero, citações/testemunhos |
| Corpo | **Manrope** | Parágrafos, botões, formulários |
| Utilitário | **Manrope**, uppercase, tracking alargado | Eyebrows/labels (ex: "PORTFÓLIO", "SERVIÇOS") |

Escala tipográfica (rem, base 16px):
```
Display XL   4.5rem / 1.05   — hero headline
Display L    3rem   / 1.1    — títulos de secção
Display M    2rem   / 1.2    — subtítulos
Body L       1.25rem / 1.6   — intro/lead
Body         1rem   / 1.65   — texto corrente
Label        0.8rem / 1.4, uppercase, tracking 0.12em — eyebrows
```

Ambas via Google Fonts (`Fraunces:ital,opsz,wght@0,9..144,300..700;1,9..144,400..600` e `Manrope:wght@400;500;600;700`).

## Layout

### Grelha
- Container máximo: 1280px, padding lateral 24px (mobile) / 64px (desktop).
- Portfólio: **masonry editorial** (colunas com alturas variadas, tipo moodboard), não uma grelha quadrada uniforme — reforça a sensação de revista/editorial e evita o "grid genérico".

### Wireframe do Hero (Home)

```
┌──────────────────────────────────────────────┐
│  [logo]                    Sobre Portfólio... │  ← header transparente sobre imagem
│                                                │
│         "Maquilhagem que revela,               │
│          não disfarça."      (Display XL, it.) │
│                                                │
│   [imagem/vídeo full-bleed de fundo]           │
│                                                │
│   ─── swatch strip (elemento assinatura) ───   │
└──────────────────────────────────────────────┘
```

### Elemento assinatura: "swatch strip"

Uma tira horizontal de 5–6 blocos de cor (retirados da paleta real de produtos/trabalhos), cada um com uma legenda pequena por baixo (ex: nome de um tom usado numa sessão real — "Terracota 02", "Rosa Antigo", "Âmbar"). Funciona como:
- Divisor visual entre secções (em vez de uma linha genérica).
- Micro-assinatura de marca — pode repetir-se, sempre com nomes de tons diferentes, criando uma narrativa de "cada trabalho tem a sua paleta".

```
[■ Terracota 02] [■ Rosa Antigo] [■ Âmbar] [■ Vinho Fosco] [■ Nude 01]
```

Implementado como componente reutilizável (`SwatchDivider.astro`), não decorativo — os nomes devem vir de tons reais usados pela maquilhadora quando possível (perguntar no BRIEF).

## Imagens

- Formato de entrega: WebP (fallback JPEG), gerado via `astro:assets`.
- Proporções a manter no portfólio: mistura de retrato (4:5) e quadrado (1:1) para o efeito masonry — evitar paisagem (16:9) que "achata" o layout.
- Hero: 1 imagem full-bleed muito forte, alta resolução (mín. 2400px de largura na origem).
- Compressão alvo: manter qualidade percetível ≥ q80, mas nunca acima de ~300KB por imagem final servida (usar `widths` do Astro Image para gerar variantes responsivas).

## Motion

- Fade + subtle rise (12px) ao entrar no viewport nas secções — uma vez, sem loop.
- Hover em cards de portfólio: zoom suave da imagem (scale 1.03, 400ms).
- Respeitar `prefers-reduced-motion`.
- Nada de motion na swatch strip — deve ler-se como um objeto estático e "impresso".

## Acessibilidade
- Contraste mínimo AA em todo o texto.
- Focus visível (outline em Ouro Fosco, 2px, offset 2px).
- Alt text descritivo em todas as imagens de portfólio (não "imagem1.jpg").
