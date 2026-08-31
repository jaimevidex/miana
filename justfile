default:
    @just --list

# Instalar dependências
install:
    npm install

# Arrancar o dev server do ASTRO com HMR (só a UI; sem /api/* do funil). Porta 4321
dev-astro:
    npm run dev

# Dev do FUNIL completo (Worker + assets + API). Build + wrangler dev (porta 8787).
# Inicia Mailpit para emails locais (SMTP :1026, UI http://localhost:8026).
dev:
    #!/usr/bin/env bash
    set -euo pipefail
    # Mata processos wrangler/workerd residuais que segurem a porta 8787
    for pid in $(lsof -ti :8787 || true); do kill -9 "$pid" 2>/dev/null || true; done
    pkill -9 -f "wrangler dev --port 8787" 2>/dev/null || true
    sleep 1
    # Arranca Mailpit se não estiver a correr
    if ! lsof -ti :1026 >/dev/null 2>&1; then
        mailpit --smtp "0.0.0.0:1026" --listen "0.0.0.0:8026" &
        sleep 1
        echo "Mailpit: SMTP :1026 | UI http://localhost:8026"
    fi
    npm run build
    npx wrangler dev --port 8787

# Parar dev server + Mailpit
down:
    #!/usr/bin/env bash
    for pid in $(lsof -ti :8787 || true); do kill -9 "$pid" 2>/dev/null || true; done
    pkill -9 -f "wrangler dev --port 8787" 2>/dev/null || true
    for pid in $(lsof -ti :1026 || true); do kill -9 "$pid" 2>/dev/null || true; done
    pkill -9 -f mailpit 2>/dev/null || true
    echo "Dev server e Mailpit parados."

# Arrancar o preview da build (porta 4321/4322)
preview:
    npm run preview

# Build estático do Astro para dist/
build:
    npm run build

# Build + limpar caches (útil quando estilos/imagens não atualizam localmente)
build-clean:
    rm -rf .astro node_modules/.vite node_modules/.cache
    npm run build

# Scaffold: verificar a tree git
status:
    git status

# Commit com mensagem fixa (usa $MSG ou "update")
commit MSG="update":
    git add -A
    git commit -m "{{MSG}}"

# Commit e push (usa $MSG ou "update")
commit-push MSG="update":
    git add -A
    git commit -m "{{MSG}}"
    git push

# Push sem commitar
push:
    git push

# Typecheck do Worker (funnel Skin Call) usando o tsconfig dedicado
worker-check:
    npx tsc --noEmit -p worker/tsconfig.json

# Deploy para a Cloudflare: build + deploy + verificação (rebuild sempre evita o bug de assets não subirem)
deploy:
    npm run build
    npx wrangler deploy
    @just verify

# Verificar se o prod serve a build mais recente de uma página
verify URL="https://marianapita.pt":
    curl -s -L --max-time 20 -o /dev/null "{{URL}}"
    @echo "HTTP ok: {{URL}}"

# Atualizar astro e integrações
upgrade:
    @echo "Atenção: a repo está no Astro v4. Só usa npx @astrojs/upgrade se fores adaptar o Tailwind a v4 (o @astrojs/tailwind@6 não é compatível com astro@7)."
    npx @astrojs/upgrade

# ---- VÍDEO ----

# Comprimir um vídeo para MP4 H.264 (web) em public/videos/.
# Uso: just video-compress "src/assets/0812 (1).mp4" mariana
video-compress SRC OUT:
    mkdir -p public/videos
    ffmpeg -y -i "{{SRC}}" -vf "scale=-2:1080" -c:v libx264 -crf 23 -preset slow -movflags +faststart -an "public/videos/{{OUT}}.mp4"

# Comprimir com corte de duração (segundos) - útil para loops.
# Uso: just video-loop "src/assets/0812 (1).mp4" mariana 8
video-loop SRC OUT DUR:
    mkdir -p public/videos
    ffmpeg -y -i "{{SRC}}" -t {{DUR}} -vf "scale=-2:1080" -c:v libx264 -crf 23 -preset slow -movflags +faststart -an "public/videos/{{OUT}}.mp4"

# Tirar uma imagem de capa (poster) de um vídeo.
# Uso: just video-poster "src/assets/0812 (1).mp4" mariana
video-poster SRC OUT:
    mkdir -p public/videos
    ffmpeg -y -i "{{SRC}}" -frames:v 1 -q:v 2 "public/videos/{{OUT}}.jpg"

# Copiar uma imagem para public/images/ com nome legível por localização.
# Uso: just img-add "caminho/foto.jpg" hero-home
img-add SRC NAME:
    mkdir -p public/images
    cp "{{SRC}}" "public/images/{{NAME}}.jpg"