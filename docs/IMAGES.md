# IMAGENS - Inventário e Regras

> **Convenção actual (2026-08):** as imagens e vídeos do site vão para `public/images/` e `public/videos/`, com nomes legíveis por localização (ex: `public/images/hero-home.jpg`, `public/videos/mariana.mp4`, `public/videos/brides.mp4`). Quando colocares uma imagem e disseres onde entra, o nome é mudado automaticamente para algo digestible desse lugar.

## Categorias

| Categoria | Usar? |
|---|---|
| Noivas | ☑ |
| Beauty | ☑ |
| Workshops | ☑ |
| Skincare | ☑ |
| Editorial / Moda | ☐ |
| Dia-a-dia | ☐ |
| Eventos | ☐ |
| Antes/Depois | ☐ |

## Inventário

*(A preencher com os ficheiros finais a disponibilizar para o site)*

| Ficheiro original | Categoria | Onde é usada | Dimensão original | Licença/autorização | Alt text (PT) | Estado |
|---|---|---|---|---|---|---|
| *A indicar* | Noivas / Beauty / Workshops / Skincare | Galeria / Serviços | Alta Resolução | Autorização verbal obtida | *A definir* | Em recolha |

## Questões

**Tem ficheiros originais em alta resolução (não versões comprimidas do Instagram)?**
- **Sim**, os ficheiros estão disponíveis em alta resolução.

**Precisa de uma sessão fotográfica nova (ex: retrato "sobre mim")?**
- **Não**, a sessão fotográfica de apoio já foi realizada ("Sessão de Lisboa").

**Tem vídeos/reels a incluir?**
- **Sim** (a confirmar/selecionar conteúdos de formato vídeo/reels para integração).

**Autorização de imagem / RGPD:**
- **Sim**, autorizações verbais obtidas com os clientes para utilização de imagem.

## Regras técnicas

- Pedir sempre o ficheiro **original**, nunca a versão já comprimida do Instagram (perde qualidade irreversivelmente).
- Nome de ficheiro consistente: `categoria-cliente-numero.ext` (ex: `noiva-joana-01.jpg`).
- Otimizar via `astro:assets`: WebP + fallback JPEG, larguras 400/800/1200/1800px, qualidade q80.
- Alt text descritivo, escrito à mão.
- Nenhuma imagem final acima de ~300KB.

---

## Regras de performance (imagens)

- **Formato**: WebP (fallback JPEG) gerado por `astro:assets`.
- **Responsivo**: larguras 400 / 800 / 1200 / 1800px - cada visor recebe o tamanho certo (mobile não descarrega o de 1800px).
- **Qualidade**: q80; máximo ~300KB por imagem servida.
- **Lazy-loading**: `loading="lazy"` + `decoding="async"` (o `<Image/>` do Astro já aplica por omissão).
- **Proporções**: retrato 4:5 / quadrado 1:1 - evitar 16:9 que "achata" o layout.
- **Alt text**: sempre descritivo, escrito à mão.

---

## Regras de performance (vídeo / reels)

> Conteúdo em vídeo deve ser sempre a exceção, não a regra. A fotografia é o elemento central do site.

### Regras obrigatórias
- **Nunca** embutir vídeo grande no hero ou em auto-play com som.
- **Poster + lazy**: usar sempre uma imagem de capa (`poster`) + `preload="metadata"` - o vídeo só carrega o essencial até o utilizador dar play.
- Loop sem áudio (`muted`, `loop`, `playsinline`, `autoplay` apenas se for loop visual curto e sem som) - o mobile não reproduz autoplay com áudio.
- **Comprimir para web**: H.264 (MP4) + AAC, reels ≤ ~10-15MB, duração curta.
- **Embed quando possível**: Instagram/YouTube embeds para conteúdos longos - o ficheiro fica lá fora e só carrega sob demanda.

### Limites de peso (referência)
| Tipo | Tamanho máx. | Formato |
|---|---|---|
| Loop curto (hero/seção) | ~3-5MB | WebM/MP4 (H.264), 720p-1080p |
| Reel/vertical | ~10-15MB | MP4 (H.264), ≤ 60s |
| Clip longo | Embed Instagram/YouTube | - |

### Componente
- Usar `src/components/Video.astro` (já existente): aceita `poster`, `loop`, `muted`, `preload`, e apenas renderiza o `<video>` com estas boas práticas.
