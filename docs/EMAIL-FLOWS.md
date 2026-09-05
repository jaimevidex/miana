# Email flows por formulário

Fonte de verdade da hierarquia de templates. O registry no código é [`EMAIL_FLOW_REGISTRY`](../worker/email-copy.ts). Settings → Emails segue a mesma árvore.

O cliente **não recebe email** ao submeter um formulário. Mariana recebe a notificação interna (`lead_notification`) e envia no chat. Contacto (`/contacto`) não existe.

## Idioma dos emails ao cliente

- A lead/cliente tem `locale` (`pt` | `en`), gravado no formulário público e editável em Dados Pessoais.
- Templates no chat usam esse locale por defeito. O toggle PT | EN no composer é override só daquele insert (`?locale=`), não grava na lead.
- Copy editável: chaves PT `email_{id}_subject` / `email_{id}_body`; EN `email_{id}_subject_en` / `email_{id}_body_en`. Fallbacks EN em `worker/email-copy-en.ts`.
- Blocos gerados (`{{bloco}}`) e o diagnóstico seguem o mesmo locale.
- Emails internos (novo pedido, diagnóstico preenchido) e PDFs anexos ficam em PT.

## 3 formulários → 4 flows

```mermaid
flowchart TD
  forms[Formularios_publicos]
  forms --> skinForm["SkinCallForm /servicos/skin-call"]
  forms --> bridalForm["BridalForm /servicos/bridal"]
  forms --> eduForm["EducationForm /servicos/education"]
  skinForm --> scLead["lead type: skin-call"]
  bridalForm --> opcao{opcao_servico}
  opcao -->|Bride| bridalLead["lead type: bridal"]
  opcao -->|Guests_and_Events| beautyLead["lead type: beauty"]
  eduForm --> eduLead["lead type: education"]
  scLead --> postLead["POST /api/lead status=novo"]
  bridalLead --> postLead
  beautyLead --> postLead
  eduLead --> postLead
  postLead --> adminNotif["Sistema: Novo Pedido para Mariana"]
  postLead --> noClient["Sem email automatico a cliente"]
```

## Catálogo

**Partilhados**

- `lead_notification` - sistema - Mariana - `handleLead`
- `terms` - cliente - chat + PDF termos
- `signature` - rodapé via `wrapEmail`

**Por flow (orçamento)**

- `bridal` / `beauty` / `skin_call` / `education` - chat "Orçamento"

**Só Bridal (antes do orçamento)**

- `bridal_intro` - chat "Introdutório" + PDF placeholder `servicos-de-noiva.pdf`
- Resposta da noiva: inbound no thread (não é template). Mariana actualiza campos da lead e depois envia o orçamento.

**Só Skin Call (depois de aceitar, página cliente)**

- `schedule` / `schedule_form` / `diagnostic_invite`
- `diagnostic_complete` - sistema - Mariana

Não são templates: inbound, mensagens `free`, os PDFs em si.

## Flow Bridal

O formulário já traz `{{nome}}`, `{{data_casamento}}`, `{{local_preparacao}}`, `{{hora_pronta}}`. O intro confirma makeup e pede hairstyling + estimativa de convidadas. O orçamento (serviço da noiva, guests, add-on Skin Call) só depois desta resposta.

```mermaid
flowchart TD
  submit[Formulario_Bride]
  submit --> notif["1. lead_notification sistema"]
  notif --> intro["2. bridal_intro chat + PDF servicos"]
  intro --> reply[Noiva_responde_no_thread]
  reply --> enrich[Mariana_actualiza_campos_da_lead]
  enrich --> quote["3. bridal orcamento"]
  quote --> pendente[status_pendente]
  pendente --> terms["4. terms partilhado + PDF"]
  terms --> accept[Aceitar_cria_cliente]
  accept --> chat[Chat_livre_na_pagina_cliente]
```

- Envio: botão no chat, só se `lead.type === bridal`. Não é automático.
- O intro **não** passa a lead a `pendente`. O orçamento continua a fazê-lo.
- Chat: botão "Introdutório" à esquerda de "Orçamento" em lead e cliente Bridal.

## Flow Skin Call

```mermaid
flowchart TD
  submit[Formulario_Skin_Call]
  submit --> notif["1. lead_notification sistema"]
  notif --> quote["2. skin_call orcamento chat"]
  quote --> pendente[status_pendente]
  pendente --> terms["3. terms partilhado + PDF"]
  terms --> accept[Aceitar_cria_cliente]
  accept --> aceite[status_aceite]
  aceite --> sched["4. schedule marcar sessoes"]
  sched --> meet["5. schedule_form Meet + diagnostico"]
  aceite --> invite["6. diagnostic_invite opcional"]
  meet --> diagPage["/diagnostico?token="]
  invite --> diagPage
  diagPage --> done["7. diagnostic_complete sistema"]
```

## Flows Beauty e Education

Sem intro. Orçamento → termos → aceitar.

```mermaid
flowchart TD
  submit[Formulario_Beauty_ou_Education]
  submit --> notif["1. lead_notification sistema"]
  notif --> quote{"2. Orcamento"}
  quote -->|beauty| beautyTpl[beauty]
  quote -->|education| educationTpl[education]
  beautyTpl --> terms["3. terms partilhado + PDF"]
  educationTpl --> terms
  terms --> accept[Aceitar_cria_cliente]
```

## Árvore Settings → Emails

Settings agrupa os templates editáveis por flow (notificações de sistema ficam fora da UI):

- Partilhados: Termos, Assinatura
- Bridal: Introdutório, Orçamento
- Beauty: Orçamento
- Skin Call: Orçamento, Marcar sessões, Confirmação, Diagnóstico
- Education: Orçamento
