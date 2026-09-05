# SITEMAP - Estrutura, Navegação e Formulários

Estado: 🟢 completo

---

## Páginas & Estrutura do Menu

| Ordem | Página | PT | EN | Tipo de Conteúdo | Formulário Integrado |
|---|---|---|---|---|---|
| 1 | **Home / Início** | `/` | `/en/` | Visão geral da marca, 3 cards de serviços, testemunhos, CTA final | - |
| 2 | **Meet Mariana** | `/sobre` | `/en/sobre` | História, percurso (Bioquímica/Cosmetologia), 3 pilares da marca | - |
| 3 | **Bridal & Beauty** | `/servicos/bridal` | `/en/servicos/bridal` | Conceito glow/sunkissed, The Bridal Experience, Guests & Events | **Formulário 1** |
| 4 | **The Skin Call** | `/servicos/skin-call` | `/en/servicos/skin-call` | Conceito científico, processo em 4 passos, 4 Planos de acompanhamento | **Formulário 2 (Quiz)** |
| 5 | **Beauty Education** | `/servicos/education` | `/en/servicos/education` | Conceito formativo, Automaquilhagem 1:1, Skincare Education, Group Sessions | **Formulário 3** |
| 6 | **Política de privacidade** | `/politica-privacidade` | `/en/politica-privacidade` | RGPD / cookies | - |

PT sem prefixo; EN com prefixo `/en/` e os mesmos slugs. Navbar `PT | EN` troca o path equivalente. `/diagnostico` é privado (token) e não usa prefixo `/en/` - a língua vem da lead/cliente.

* **Botão de Destaque no Menu (Header):** `[ Let's Book Your Glow ]` *(Scroll direto para agendamento/contacto)*.
* **Switcher de idioma:** `PT | EN` no header (desktop e mobile).

---

## Formulários por Página (Especificação Técnica)

> **Mensagem de Sucesso (Comum a todos os formulários pós-submissão):** > *"Obrigada! O teu pedido foi registado. Responderei assim que possível, num prazo de até 48h com todas as informações."*

Os 3 formulários enviam `locale` hidden (`pt` | `en`) conforme a URL. Os **valores** dos radios/checkboxes guardados em `form_data` mantêm as strings actuais; só as labels visíveis traduzem.

### 📝 FORMULÁRIO 1: BRIDAL & BEAUTY
* **Campos Comuns:**
  * Nome completo `[ Texto ]`
  * Contacto telefónico `[ Tel ]`
  * E-mail `[ Email ]`
  * Opção de Serviço: `Bride` | `Guests & Events`

* **Se selecionar BRIDE:**
  1. Data do casamento `[ Data ]`
  2. Hora a que tens de estar pronta `[ Horário ]`
  3. Local da preparação `[ Texto ]`
  4. Local da prova `[ Texto ]`

* **Se selecionar GUESTS & EVENTS:**
  1. Data do evento `[ Data ]`
  2. Hora a que tens de estar pronta `[ Horário ]`
  3. Local do serviço / preparação `[ Texto ]`
  4. Que serviços procuras? `Makeup` | `Pack Makeup & Hair`
  5. Número de pessoas `[ Número ]`

---

### 📝 FORMULÁRIO 2: THE SKIN CALL (Quiz de Diagnóstico)
* **Campos Comuns:**
  * Nome completo `[ Texto ]`
  * Contacto telefónico `[ Tel ]`
  * E-mail `[ Email ]`

* **Perguntas de Diagnóstico:**
  1. **Qual é o teu objetivo principal neste momento?**
     * A) Ajustar a rotina básica e organizar os produtos que já tenho. *(Recomendação: One Time Call)*
     * B) Introduzir os meus primeiros ativos de tratamento (ex: ácidos/antioxidantes) e ver a evolução. *(Recomendação: Duo Call)*
     * C) Gerir variáveis mais persistentes que exigem protocolos mais elaborados. *(Recomendação: Triple Call)*
     * D) Fazer um acompanhamento de longo prazo, introduzir Retinol e adaptar a pele às 4 estações do ano. *(Recomendação: Full Year Call)*
  2. **Já usas ativos de tratamento na tua rotina atual?** `Sim` | `Não` | `Não sei`
  3. **Procuras um ajuste pontual ou um acompanhamento de evolução?** `Ajuste pontual` | `Acompanhamento contínuo/evolução`
  4. **Que plano achas ser mais indicado para ti?** `One Time Call (Plano 3M)` | `Duo Call (Plano 6M)` | `Triple Call (Plano 9M)` | `Full Year Call (Plano 12M)` | `Ainda não tenho a certeza`
  5. **Quais as tuas principais preocupações com a pele?** `[ Caixa de Texto Livre ]`

---

### 📝 FORMULÁRIO 3: BEAUTY EDUCATION (Workshops)
* **Campos Comuns:**
  * Nome completo `[ Texto ]`
  * Contacto telefónico `[ Tel ]`
  * E-mail `[ Email ]`
  * Formato pretendido: `Automaquilhagem 1:1` | `Skincare Education` | `Group Sessions & Bachelorette Parties`
  * Local do workshop `[ Texto ]`
  * Data e hora propostas `[ Data / Hora ]`
  * És uma empresa ou particular? `Empresa` | `Particular`

* **Se selecionar GROUP SESSIONS & BACHELORETTE PARTIES:**
  1. Qual a modalidade pretendida? `Makeup` | `Skincare`
  2. Número de participantes `[ Número ]`
  3. Regime pretendido: `Masterclass` | `Hands-on`

---

## Rodapé (Footer)

* **Logótipo / Nome:** MARIANA (Skincare Routines & Sunkissed Bridal Makeup)
* **Contacto Directo:** `mpitamakeup@gmail.com`
* **Redes Sociais:** Instagram (`@marianapita_makeup`)
* **Localização / Atuação:** Lisboa & Santarém (Atendimento presencial / *on location* & consultorias online)
* **Links Legais:** Política de Privacidade & Cookies (RGPD)
* **Copyright:** *© 2026 MARIANA. Todos os direitos reservados.*
