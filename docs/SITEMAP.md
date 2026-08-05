# SITEMAP — Estrutura e Navegação

## Páginas (v1 — demo sem backend)

```
/                    Home
/sobre               Sobre (história, foto, valores)
/portfolio           Portfólio (grelha de trabalhos, filtro por categoria)
/servicos            Serviços (o que faz, para quem, "pedir orçamento")
/contacto            Contacto (formulário + redes sociais + WhatsApp)
```

Páginas opcionais (fase 2, fora do escopo do demo):
```
/blog                Blog / artigos
/marcacoes           Marcação online (Calendly embed)
/politica-privacidade
```

## Navegação principal (header)

```
[Logótipo]     Sobre   Portfólio   Serviços   Contacto     [CTA: Pedir orçamento]
```

- Mobile: menu hamburguer, full-screen overlay, CTA sempre visível.
- Sticky header com fundo transparente sobre o hero, sólido ao fazer scroll.

## Footer

```
Logótipo + tagline curta
Navegação secundária (mesmas páginas)
Redes sociais (Instagram, Facebook, WhatsApp)
Email de contacto
© Ano · Nome · "Site por [teu nome/estúdio]"
```

## Fluxo de utilizador esperado

1. Chega via Instagram/Google → Home (hero visual forte + prova social rápida).
2. Explora Portfólio para validar qualidade/estilo.
3. Lê Sobre para confiança/conexão pessoal.
4. Vai a Serviços para perceber o que está incluído.
5. Contacta via formulário ou WhatsApp.

## Estrutura de secções por página

### Home (`/`)
1. Hero — imagem/vídeo forte + headline + CTA
2. Introdução curta (quem é, em 2-3 frases)
3. Destaque de portfólio (6–9 imagens, link para portfólio completo)
4. Serviços (resumo em 3 cards)
5. Testemunhos (se existirem)
6. CTA final de contacto

### Sobre (`/sobre`)
1. Foto de retrato
2. História / percurso
3. Valores / abordagem ao trabalho
4. Certificações/formações (se aplicável)
5. CTA de contacto

### Portfólio (`/portfolio`)
1. Filtro por categoria (ex: Noivas, Editorial, Dia-a-dia)
2. Grelha de imagens (masonry, ver DESIGN.md)
3. Lightbox ao clicar

### Serviços (`/servicos`)
1. Lista de serviços (cards): nome, descrição curta, "a partir de X€" ou "sob consulta"
2. FAQ curta (opcional)
3. CTA de contacto

### Contacto (`/contacto`)
1. Formulário (nome, email, telefone, tipo de serviço, mensagem, data do evento)
2. Dados diretos (email, telefone, WhatsApp)
3. Redes sociais
4. Mapa/zona de atuação (opcional)
