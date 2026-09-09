import {
  bodyFromEditor,
  EMAIL_BLOCO,
  EMAIL_BOTAO_CHAMADA,
  EMAIL_BOTAO_FORMULARIO,
  EMAIL_COPY_FALLBACKS,
  EMAIL_COPY_SETTING_KEYS,
  EMAIL_FLOW_GROUPS,
  EMAIL_FLOW_REGISTRY,
  EMAIL_QUOTE_TEMPLATE_IDS,
  EMAIL_TEMPLATE_FIELDS,
  EMAIL_TEMPLATE_IDS,
  CUSTOM_TEMPLATE_ID_RE,
  MAX_CUSTOM_TEMPLATES,
  collapseDuplicatePlaceholders,
  attachPersonFields,
  customAttachmentSettingKeys,
  customCopySettingKeys,
  customTemplateFromMap,
  customTemplatesForFlow,
  emailFieldLabel,
  fieldsForFlow,
  flowForLeadType,
  isBuiltinTemplateId,
  isCustomEmailFlow,
  isCustomTemplateId,
  isQuoteTemplate,
  newCustomTemplateId,
  parseCustomRegistry,
  sanitizeCustomLabel,
  serializeCustomRegistry,
  settingsEmailEntries,
  settingsPanelId,
  fillTemplateBody,
  formatEmailDateTime,
  formatEmailDateValue,
  interpolate,
  previewTemplateBody,
  templateFromMap,
  templateVars,
  textToHtml,
} from '../worker/email-copy.ts';
import { EMAIL_COPY_FALLBACKS_EN } from '../worker/email-copy-en.ts';
import { EMAIL_STYLE, EMAIL_WIDTH, snapColor, snapFontSize } from '../worker/email-style.ts';
import { beautyBlock, bridalBlock, diagnosticBlock, educationBlock, skinCallBlock } from '../worker/templates/blocks.ts';
import { beautyQuoteTotal, bridalQuoteTotal, formatEuro, parseTravelFee, reservationDeposit } from '../worker/bridal-pricing.ts';
import { parseLocale } from '../worker/locale.ts';
import { bridalEmail } from '../worker/templates/bridal.ts';
import { bridalIntroEmail } from '../worker/templates/bridal_intro.ts';
import { scheduleFormEmail } from '../worker/templates/schedule_form.ts';
import { emailSignatureHtml, wrapEmail } from '../worker/templates/base.ts';
import { bridalServicesPlaceholderPdf, BRIDAL_SERVICES_PLACEHOLDER_FILENAME } from '../worker/assets/bridal-services-placeholder.ts';
import { PRICING_FALLBACKS } from '../worker/pricing.ts';
import { resolveOutgoingAttachmentType, validateOutgoingAttachment } from '../worker/conversation.ts';
import { normalizeEmailBodyHtml, stripEditorLocks } from '../worker/email-sanitize.ts';

function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error('FAIL', msg);
    process.exitCode = 1;
  } else {
    console.log('ok', msg);
  }
}

const styledP = (text: string) => `<p style="${EMAIL_STYLE.p}">${text}</p>`;
const styledH3 = (text: string) => `<h3 style="${EMAIL_STYLE.h3}">${text}</h3>`;

assert(interpolate('Olá {{nome}}', { nome: 'Ana' }) === 'Olá Ana', 'interpolate nome');
assert(interpolate('{{quando}} já', { quando: 'terça' }) === 'terça já', 'interpolate quando');
assert(interpolate('{{foo}}', { nome: 'Ana' }) === '{{foo}}', 'unknown placeholder stays');

const html = textToHtml('Olá {{nome}},\n\nSegunda linha.', { nome: 'Ana' });
assert(html.includes('<p>Olá Ana,</p>'), 'textToHtml paragraph');
assert(html.includes('Segunda linha.'), 'textToHtml second paragraph');
assert(textToHtml('   ') === '', 'empty text');
assert(textToHtml('linha1\nlinha2').includes('<br/>'), 'single newline is br');

const rich = textToHtml('<p>Olá {{nome}},</p><p>Texto <strong>negrito</strong>.</p>', { nome: 'Ana' });
assert(rich.includes('Olá Ana,'), 'html copy interpolates nome');
assert(rich.includes('<strong>negrito</strong>'), 'html copy keeps formatting');
assert(!rich.includes('<script>'), 'html copy strips script');

const preview = previewTemplateBody('<h2>Orçamento</h2>{{bloco}}<p>Fecho</p>', '<p>TABELA</p>');
assert(preview.includes('<!--miana-block-start-->'), 'preview wraps generated block');
assert(preview.includes('data-miana-block="1"'), 'preview marks generated block');
assert(!preview.includes('contenteditable="false"'), 'preview block is editable');
assert(preview.includes('TABELA'), 'preview shows generated table');
assert(preview.includes('<p>Fecho</p>'), 'preview keeps closing copy');
assert(bodyFromEditor(preview) === `${styledH3('Orçamento')}{{bloco}}${styledP('Fecho')}`, 'editor save restores placeholder');

const previewEnd = previewTemplateBody('<h2>Orçamento</h2><p>Olá {{nome}}</p>{{bloco}}', '<p>TABELA</p>');
assert(previewEnd.includes('<!--miana-block-end--><p><br></p>'), 'preview adds editable paragraph after block');
assert(bodyFromEditor(previewEnd) === `${styledH3('Orçamento')}${styledP('Olá {{nome}}')}{{bloco}}`, 'editor save strips empty paragraph after block');

const previewStart = previewTemplateBody('{{bloco}}<p>Fecho</p>', '<p>TABELA</p>');
assert(previewStart.startsWith('<p><br></p><!--miana-block-start-->'), 'preview adds editable paragraph before block');
assert(bodyFromEditor(previewStart) === `{{bloco}}${styledP('Fecho')}`, 'editor save strips empty paragraph before block');

assert(!fillTemplateBody('<p>Só texto</p>', '<p>TABELA</p>').includes('TABELA'), 'fill does not append block without {{bloco}}');

const filled = fillTemplateBody('<p>Olá {{nome}}</p>{{bloco}}', '<p>Preços</p>', { nome: 'Ana' });
assert(filled.includes('Olá Ana'), 'fill interpolates nome');
assert(filled.includes('Preços'), 'fill injects live block');
assert(!filled.includes('{{bloco}}'), 'fill removes placeholder');

const btnPreview = previewTemplateBody(
  `<p>Olá</p>${EMAIL_BOTAO_CHAMADA}${EMAIL_BOTAO_FORMULARIO}<p>Fecho</p>`,
  '',
  { botao_chamada: '<p>MEET</p>', botao_formulario: '<p>FORM</p>' },
);
assert(btnPreview.includes('data-miana-block="botao_chamada"'), 'preview marks meet button');
assert(btnPreview.includes('data-miana-block="botao_formulario"'), 'preview marks form button');
assert(btnPreview.includes('contenteditable="false"'), 'preview locks button labels');
assert(btnPreview.includes('MEET') && btnPreview.includes('FORM'), 'preview shows both buttons');
assert(
  bodyFromEditor(btnPreview) === `${styledP('Olá')}${EMAIL_BOTAO_CHAMADA}${EMAIL_BOTAO_FORMULARIO}${styledP('Fecho')}`,
  'editor save restores button tokens',
);
const filledButtons = fillTemplateBody(
  `<p>Olá {{nome}}</p>${EMAIL_BOTAO_CHAMADA}${EMAIL_BOTAO_FORMULARIO}`,
  '',
  { nome: 'Ana' },
  { botao_chamada: '<a href="https://meet.example/x">Meet</a>', botao_formulario: '<a href="https://miana.pt/f">Form</a>' },
);
assert(filledButtons.includes('Olá Ana'), 'fill interpolates nome with buttons');
assert(filledButtons.includes('https://meet.example/x'), 'fill injects meet button');
assert(filledButtons.includes('https://miana.pt/f'), 'fill injects form button');
assert(!filledButtons.includes('{{botao_chamada}}') && !filledButtons.includes('{{botao_formulario}}'), 'fill removes button tokens');

const quoteHtml = bridalEmail(
  { nome: 'Ana', data_casamento: '2026-10-15' },
  PRICING_FALLBACKS,
  undefined,
  {
    subject: 'Assunto custom',
    body: '<h2>Titulo custom</h2><p>Olá {{nome}}, intro de teste.</p>{{bloco}}<p>Fecho de teste.</p>',
  },
  {
    email: 'hello@test.pt',
    instagram: 'https://instagram.com/bymarianapita',
    website: 'https://marianapita.pt',
    assetBase: 'https://marianapita.pt',
  },
);
assert(quoteHtml.includes('Titulo custom'), 'bridal title from copy');
assert(quoteHtml.includes('Olá Ana, intro de teste.'), 'bridal intro interpolated');
assert(quoteHtml.includes('Fecho de teste.'), 'bridal closing');
assert(quoteHtml.includes('mailto:hello@test.pt'), 'signature email icon');
assert(quoteHtml.includes('/email/assinatura.png'), 'signature logo');
assert(quoteHtml.includes('/email/icon-instagram.png'), 'signature instagram icon');
assert((quoteHtml.match(/\/email\/assinatura\.png/g) || []).length === 1, 'quote wraps signature once');
assert(quoteHtml.includes('Orçamento'), 'generated price block stays');
assert(!quoteHtml.includes('<script>'), 'no raw script from copy');
assert(!quoteHtml.includes('{{bloco}}'), 'sent email has no placeholder');

assert(formatEmailDateValue('2026-10-15') === '15-10-2026', 'ISO date becomes DD-MM-YYYY');
assert(formatEmailDateValue('2026-10-15T14:30') === '15-10-2026 14:30', 'ISO datetime keeps time');
assert(formatEmailDateValue('{{data_casamento}}') === '{{data_casamento}}', 'date helper leaves tokens');
assert(formatEmailDateTime(new Date('2026-01-15T10:30:00.000Z')) === '15-01-2026 10:30', 'quando uses Lisbon DD-MM-YYYY HH:mm');
const vars = templateVars(
  { nome: 'Ana', data_casamento: '2026-10-15', data_hora: '2026-11-20T09:00' },
  { quando: 'terça' },
);
assert(vars.nome === 'Ana' && vars.data_casamento === '15-10-2026' && vars.quando === 'terça', 'templateVars formats dates');
assert(vars.data_hora === '20-11-2026 09:00', 'templateVars formats data_hora');
const withDate = fillTemplateBody(
  '<p>Casamento em {{data_casamento}}</p>{{bloco}}',
  '<p>ok</p>',
  vars,
);
assert(withDate.includes('Casamento em 15-10-2026'), 'fill interpolates form fields');

assert(EMAIL_COPY_SETTING_KEYS.includes('email_bridal_intro_subject'), 'settings key subject');
assert(EMAIL_COPY_SETTING_KEYS.includes('email_bridal_intro_body'), 'settings key body');
assert(!EMAIL_COPY_FALLBACKS.bridal_intro.body.includes('{{bloco}}'), 'intro has no bloco');
assert(EMAIL_FLOW_REGISTRY.some((e) => e.id === 'bridal_intro' && e.flow === 'bridal' && e.step === 'intro'), 'registry bridal intro');
const settingsEntries = settingsEmailEntries();
assert(settingsEntries.every((e) => e.audience === 'client'), 'settings entries are client templates only');
assert(!settingsEntries.some((e) => e.id === 'signature'), 'settings hide signature');
assert(settingsEntries.filter((e) => e.step === 'terms').map((e) => e.id).join(',') === 'bridal_terms,beauty_terms,skin_call_terms,education_terms', 'terms at end of each flow');
assert(settingsPanelId('signature') === 'footer', 'signature panel id');
assert(EMAIL_FLOW_GROUPS.map((g) => g.id).join(',') === 'bridal,beauty,skin-call,education', 'settings flow order');
assert(EMAIL_COPY_SETTING_KEYS.includes('email_bridal_terms_body'), 'settings key bridal terms');
assert(EMAIL_COPY_SETTING_KEYS.includes('email_beauty_terms_body_en'), 'settings key beauty terms EN');
const seededTerms = templateFromMap(
  { email_terms_subject: 'Termos legado', email_terms_body: '<p>Legado</p>{{bloco}}' },
  'bridal_terms',
  EMAIL_COPY_FALLBACKS.bridal_terms,
  'pt',
);
assert(seededTerms.subject === 'Termos legado' && seededTerms.body.includes('Legado'), 'per-flow terms seed from email_terms_*');
assert(
  settingsEntries.every((e) => EMAIL_FLOW_GROUPS.some((g) => g.id === e.flow)),
  'every settings entry belongs to a flow group',
);

const introCopy = {
  subject: 'Serviço de noiva',
  body:
    '<p>Alô Noiva {{nome}}!!!</p><p>Dia {{data_casamento}} em {{local_preparacao}} às {{hora_pronta}}.</p>',
};
const introHtml = bridalIntroEmail(
  {
    nome: 'Ana',
    data_casamento: '2026-10-15',
    local_preparacao: 'Hotel Pestana',
    hora_pronta: '14:00',
  },
  introCopy,
  {
    email: 'hello@test.pt',
    instagram: 'https://instagram.com/bymarianapita',
    website: 'https://marianapita.pt',
    assetBase: 'https://marianapita.pt',
  },
);
assert(introHtml.includes('Alô Noiva Ana!!!'), 'intro interpolates nome');
assert(introHtml.includes('15-10-2026'), 'intro interpolates wedding date');
assert(introHtml.includes('Hotel Pestana'), 'intro interpolates prep location');
assert(introHtml.includes('14:00'), 'intro interpolates ready time');
assert(!introHtml.includes('{{nome}}'), 'intro leaves no nome placeholder');
assert(!introHtml.includes('{{bloco}}'), 'intro sent html has no bloco');
assert(introHtml.includes('/email/assinatura.png'), 'intro has signature');
assert((introHtml.match(/\/email\/assinatura\.png/g) || []).length === 1, 'intro wraps signature once');

const footer = {
  email: 'hello@test.pt',
  phone: '+351 912 345 678',
  instagram: 'https://instagram.com/bymarianapita',
  website: 'https://marianapita.pt',
  assetBase: 'https://marianapita.pt',
};
const sig = emailSignatureHtml(footer);
assert(sig.includes('align="left"'), 'signature logo stays left aligned');
assert(sig.includes('valign="middle"'), 'signature columns sit side by side');
assert(sig.includes('width:auto'), 'signature table hugs logo and icons');
assert(!sig.includes('width="100%"'), 'signature table does not stretch across the email');
assert(!sig.includes('align="center"'), 'signature icons are not centered in leftover space');
assert(sig.includes('tel:+351912345678'), 'signature phone is a tel link');
assert(sig.includes('+351 912 345 678'), 'signature shows phone under icons');
assert(!sig.includes('margin:16px auto'), 'signature block is not centered');
assert((wrapEmail('<p>Corpo</p>', footer).match(/\/email\/assinatura\.png/g) || []).length === 1, 'wrapEmail adds one signature');
const wrapped = wrapEmail('<p>Corpo</p>', footer);
assert(wrapped.includes('max-width:100%'), 'wrapEmail shrinks on small screens');
assert(wrapped.includes(`width="${EMAIL_WIDTH}"`), 'wrapEmail table width 720');
assert(wrapped.includes(`width:${EMAIL_WIDTH}px`), 'wrapEmail css width 720');
assert(!wrapped.includes('max-width:560px'), 'wrapEmail no longer 560');
assert(wrapped.includes('role="presentation"'), 'wrapEmail uses presentation tables');
assert(!bridalBlock({ servicos_procurados: 'Makeup' }, PRICING_FALLBACKS).includes('display:flex'), 'price rows are not flex');
assert(bridalBlock({ servicos_procurados: 'Makeup' }, PRICING_FALLBACKS).includes('align="right"'), 'price aligned right in table');
assert(bridalBlock({ servicos_procurados: 'Makeup' }, PRICING_FALLBACKS).includes('width="88"'), 'price column has fixed width');
assert(EMAIL_STYLE.h3.includes('font-size:16px') && EMAIL_STYLE.h3.includes('font-weight:700'), 'section titles are 16px bold');
assert(EMAIL_STYLE.h2 === EMAIL_STYLE.h3, 'h2 matches h3 so there is no fourth size');
const sigNoPhone = emailSignatureHtml({ ...footer, phone: '' });
assert(!sigNoPhone.includes('tel:'), 'signature hides empty phone');

for (const id of EMAIL_TEMPLATE_IDS) {
  assert(!EMAIL_COPY_FALLBACKS[id].body.includes('assinatura.png'), `PT ${id} body has no signature image`);
  assert(!EMAIL_COPY_FALLBACKS_EN[id].body.includes('assinatura.png'), `EN ${id} body has no signature image`);
}

const pdf = bridalServicesPlaceholderPdf();
assert(BRIDAL_SERVICES_PLACEHOLDER_FILENAME === 'servicos-de-noiva.pdf', 'bridal pdf filename');
assert(new TextDecoder().decode(pdf.slice(0, 5)) === '%PDF-', 'bridal pdf magic');

assert(parseLocale('en') === 'en', 'parseLocale en');
assert(parseLocale('pt') === 'pt', 'parseLocale pt');
assert(parseLocale('fr') === 'pt', 'parseLocale unknown falls back to pt');
assert(parseLocale('') === 'pt', 'parseLocale empty falls back to pt');

for (const id of EMAIL_TEMPLATE_IDS) {
  assert(!!EMAIL_COPY_FALLBACKS_EN[id], `EN fallback exists for ${id}`);
  assert(!!EMAIL_COPY_FALLBACKS[id].subject.trim(), `PT ${id} has default subject`);
  assert(!!EMAIL_COPY_FALLBACKS_EN[id].subject.trim(), `EN ${id} has default subject`);
}
assert(EMAIL_COPY_FALLBACKS.bridal.subject === 'Orçamento - Bridal', 'PT bridal quote has default subject');
assert(EMAIL_COPY_FALLBACKS.education.subject === 'Orçamento - Education', 'PT education has default subject');
assert(EMAIL_COPY_FALLBACKS.bridal_terms.subject === 'Termos - Bridal', 'PT bridal terms has default subject');
assert(EMAIL_COPY_FALLBACKS.beauty_terms.subject === 'Termos - Beauty', 'PT beauty terms has default subject');
assert(EMAIL_COPY_FALLBACKS.skin_call_terms.subject === 'Termos - Skin Call', 'PT skin_call terms has default subject');
assert(EMAIL_COPY_FALLBACKS.education_terms.subject === 'Termos - Education', 'PT education terms has default subject');
assert(!!EMAIL_COPY_FALLBACKS.bridal_intro.subject, 'PT intro has subject');
assert(!!EMAIL_COPY_FALLBACKS.beauty.subject, 'PT beauty has subject');
assert(EMAIL_COPY_FALLBACKS.bridal_intro.body.includes('Alô Noiva {{nome}}'), 'PT intro default copy');
assert(EMAIL_COPY_FALLBACKS.beauty.body.includes('Alô {{nome}}') && EMAIL_COPY_FALLBACKS.beauty.body.includes(EMAIL_BLOCO), 'PT beauty copy + table');
assert(EMAIL_COPY_FALLBACKS.skin_call.body.includes('{{plano}}') && EMAIL_COPY_FALLBACKS.skin_call.body.includes(EMAIL_BLOCO), 'PT skin_call copy + table');
assert(EMAIL_COPY_FALLBACKS.schedule.body.includes('{{plano}}') && !EMAIL_COPY_FALLBACKS.schedule.body.includes(EMAIL_BLOCO), 'PT schedule copy without table');
assert(EMAIL_COPY_FALLBACKS.schedule_form.body.includes('{{quando}}') && EMAIL_COPY_FALLBACKS.schedule_form.body.includes(EMAIL_BOTAO_CHAMADA) && EMAIL_COPY_FALLBACKS.schedule_form.body.includes(EMAIL_BOTAO_FORMULARIO), 'PT confirmation copy + button tokens');
assert(EMAIL_COPY_FALLBACKS_EN.bridal_intro.body.includes('Hello Bride {{nome}}'), 'EN intro default copy');
assert(EMAIL_COPY_FALLBACKS_EN.beauty.body.includes('Hello {{nome}}') && EMAIL_COPY_FALLBACKS_EN.beauty.body.includes(EMAIL_BLOCO), 'EN beauty copy + table');
assert(EMAIL_COPY_FALLBACKS_EN.skin_call.body.includes('{{plano}}') && EMAIL_COPY_FALLBACKS_EN.skin_call.body.includes(EMAIL_BLOCO), 'EN skin_call copy + table');
assert(EMAIL_COPY_FALLBACKS_EN.schedule.body.includes('{{plano}}') && !EMAIL_COPY_FALLBACKS_EN.schedule.body.includes(EMAIL_BLOCO), 'EN schedule copy without table');
assert(EMAIL_COPY_FALLBACKS_EN.schedule_form.body.includes('{{quando}}') && EMAIL_COPY_FALLBACKS_EN.schedule_form.body.includes(EMAIL_BOTAO_CHAMADA) && EMAIL_COPY_FALLBACKS_EN.schedule_form.body.includes(EMAIL_BOTAO_FORMULARIO), 'EN confirmation copy + button tokens');
assert(!!EMAIL_COPY_FALLBACKS_EN.bridal_intro.subject, 'EN intro has subject');
assert(EMAIL_COPY_FALLBACKS_EN.bridal.subject === 'Quote - Bridal', 'EN bridal quote has default subject');
assert(EMAIL_COPY_FALLBACKS_EN.education.subject === 'Quote - Education', 'EN education has default subject');
assert(EMAIL_COPY_FALLBACKS_EN.bridal_terms.subject === 'Terms - Bridal', 'EN bridal terms has default subject');
assert(EMAIL_COPY_FALLBACKS_EN.beauty_terms.subject === 'Terms - Beauty', 'EN beauty terms has default subject');
assert(EMAIL_COPY_FALLBACKS_EN.skin_call_terms.subject === 'Terms - Skin Call', 'EN skin_call terms has default subject');
assert(EMAIL_COPY_FALLBACKS_EN.education_terms.subject === 'Terms - Education', 'EN education terms has default subject');
for (const id of EMAIL_QUOTE_TEMPLATE_IDS) {
  assert(isQuoteTemplate(id), `${id} is a quote template`);
}
assert(EMAIL_COPY_FALLBACKS.bridal.body === EMAIL_BLOCO, 'PT bridal quote is table only');
assert(EMAIL_COPY_FALLBACKS.education.body === EMAIL_BLOCO, 'PT education is table only');
assert(!isQuoteTemplate('bridal_intro') && !isQuoteTemplate('bridal_terms'), 'intro and terms are not quote templates');
assert(EMAIL_COPY_FALLBACKS.bridal_terms.body === EMAIL_BLOCO, 'PT terms body is {{bloco}} only');
assert(EMAIL_COPY_FALLBACKS_EN.bridal.body.includes(EMAIL_BLOCO), 'EN bridal has {{bloco}}');
assert(EMAIL_COPY_FALLBACKS_EN.beauty.body.includes(EMAIL_BLOCO), 'EN beauty has {{bloco}}');
assert(EMAIL_COPY_FALLBACKS_EN.skin_call.body.includes(EMAIL_BLOCO), 'EN skin_call has {{bloco}}');
assert(EMAIL_COPY_FALLBACKS_EN.education.body.includes(EMAIL_BLOCO), 'EN education has {{bloco}}');
assert(EMAIL_COPY_FALLBACKS_EN.bridal_terms.body.includes(EMAIL_BLOCO), 'EN bridal terms has {{bloco}}');
assert(EMAIL_COPY_FALLBACKS_EN.beauty_terms.body.includes(EMAIL_BLOCO), 'EN beauty terms has {{bloco}}');
assert(EMAIL_COPY_FALLBACKS_EN.skin_call_terms.body.includes(EMAIL_BLOCO), 'EN skin_call terms has {{bloco}}');
assert(EMAIL_COPY_FALLBACKS_EN.education_terms.body.includes(EMAIL_BLOCO), 'EN education terms has {{bloco}}');
assert(!EMAIL_COPY_FALLBACKS_EN.schedule_form.body.includes(EMAIL_BLOCO), 'EN schedule_form uses button tokens not {{bloco}}');
assert(!EMAIL_COPY_FALLBACKS.schedule_form.body.includes(EMAIL_BLOCO), 'PT schedule_form uses button tokens not {{bloco}}');
assert(!EMAIL_COPY_FALLBACKS_EN.bridal_intro.body.includes(EMAIL_BLOCO), 'EN intro has no {{bloco}}');
assert(!EMAIL_COPY_FALLBACKS_EN.schedule.body.includes(EMAIL_BLOCO), 'EN schedule has no {{bloco}}');
assert(EMAIL_COPY_SETTING_KEYS.includes('email_bridal_subject_en'), 'settings key EN subject');
assert(EMAIL_COPY_SETTING_KEYS.includes('email_bridal_body_en'), 'settings key EN body');

for (const id of EMAIL_TEMPLATE_IDS) {
  const fields = EMAIL_TEMPLATE_FIELDS[id];
  assert(!!fields && fields.length > 0, `fields exist for ${id}`);
  assert(fields.includes('nome'), `${id} includes nome`);
}
const CONTACT = 'nome,email,telefone,locale';
assert(EMAIL_TEMPLATE_FIELDS.bridal.join(',') === `${CONTACT},opcao_servico,data_casamento,hora_pronta,local_preparacao,local_prova,data_prova,servicos_procurados,guests_makeup,guests_hair,guests_pack,addon_skin_call,mensagem,valor_deslocacao,sinal_reserva`, 'bridal field list');
assert(EMAIL_TEMPLATE_FIELDS.bridal_intro.includes('telefone') && EMAIL_TEMPLATE_FIELDS.bridal_intro.includes('mensagem') && !EMAIL_TEMPLATE_FIELDS.bridal_intro.includes('bloco'), 'bridal intro has all lead fields');
assert(EMAIL_TEMPLATE_FIELDS.beauty.includes('sinal_reserva') && EMAIL_TEMPLATE_FIELDS.beauty.includes('data_evento') && !EMAIL_TEMPLATE_FIELDS.beauty.includes('bloco'), 'beauty fields');
assert(EMAIL_TEMPLATE_FIELDS.skin_call.includes('rotina') && !EMAIL_TEMPLATE_FIELDS.skin_call.includes('sinal_reserva') && !EMAIL_TEMPLATE_FIELDS.skin_call.includes('valor_deslocacao'), 'skin_call has no deposit or travel field');
assert(EMAIL_TEMPLATE_FIELDS.education.includes('sinal_reserva') && EMAIL_TEMPLATE_FIELDS.education.includes('formato'), 'education fields');
assert(EMAIL_TEMPLATE_FIELDS.bridal_terms.includes('data_casamento') && EMAIL_TEMPLATE_FIELDS.bridal_terms.includes('titular'), 'bridal terms has lead + payment fields');
assert(EMAIL_TEMPLATE_FIELDS.beauty_terms.includes('data_evento') && EMAIL_TEMPLATE_FIELDS.beauty_terms.includes('iban'), 'beauty terms has lead + payment fields');
assert(EMAIL_TEMPLATE_FIELDS.schedule.includes('plano') && EMAIL_TEMPLATE_FIELDS.schedule.includes('email'), 'schedule has skin-call fields');
assert(EMAIL_TEMPLATE_FIELDS.schedule_form.includes('quando') && EMAIL_TEMPLATE_FIELDS.schedule_form.includes('rotina'), 'schedule_form has session + lead fields');
assert(!Object.values(EMAIL_TEMPLATE_FIELDS).some((fields) => fields.includes('bloco')), 'picker has no bloco field');
const person = attachPersonFields({ plano: 'Duo' }, { nome: 'Ana', email: 'ana@test.pt', telefone: '910000000', locale: 'en' });
assert(person.nome === 'Ana' && person.email === 'ana@test.pt' && person.telefone === '910000000' && person.plano === 'Duo', 'attachPersonFields merges lead columns');
assert(EMAIL_QUOTE_TEMPLATE_IDS.join(',') === 'bridal,beauty,skin_call,education', 'quote ids for Tabela de Preço');
assert(emailFieldLabel('nome') === 'Nome', 'friendly label nome');
assert(emailFieldLabel('data_casamento') === 'Data do casamento', 'friendly label wedding date');
assert(emailFieldLabel('data_prova') === 'Data da prova', 'friendly label trial date');
assert(emailFieldLabel('quando') === 'Data e hora da sessão', 'friendly label quando');
assert(emailFieldLabel('telefone') === 'Telefone', 'friendly label telefone');
assert(emailFieldLabel('rotina') === 'Rotina', 'friendly label rotina');
assert(emailFieldLabel('opcao_servico') === 'Opção de serviço', 'friendly label opcao_servico');
assert(emailFieldLabel('sinal_reserva') === 'Valor sinal', 'friendly label sinal');
assert(bodyFromEditor('<p>Olá</p><!--miana-block-start--><div data-miana-block="1"><p>editado</p></div><!--miana-block-end-->') === `${styledP('Olá')}{{bloco}}`, 'edited block still restores {{bloco}}');
assert(
  bodyFromEditor('<p>Olá</p><!--miana-block-start:botao_chamada--><div data-miana-block="botao_chamada"><a>x</a></div><!--miana-block-end:botao_chamada-->') === `${styledP('Olá')}${EMAIL_BOTAO_CHAMADA}`,
  'edited meet button still restores token',
);

const confirmHtml = scheduleFormEmail({
  nome: 'Ana',
  whenLabel: 'terça às 10:00',
  meetUrl: 'https://meet.google.com/abc-defg-hij',
  formUrl: 'https://miana.pt/diagnostico?token=xyz',
});
assert(confirmHtml.includes('https://meet.google.com/abc-defg-hij'), 'confirmation injects live Meet url');
assert(confirmHtml.includes('https://miana.pt/diagnostico?token=xyz'), 'confirmation injects live form url');
assert(confirmHtml.includes('Entrar na Chamada'), 'confirmation has Meet button label');
assert(confirmHtml.includes('Abrir formulário'), 'confirmation has form button label');
assert(!confirmHtml.includes('{{botao_chamada}}') && !confirmHtml.includes('{{botao_formulario}}'), 'confirmation has no leftover button tokens');
assert(
  (confirmHtml.match(/<a [^>]*>\s*Entrar na Chamada\s*<\/a>/g) || []).length === 1,
  'confirmation has a single Meet button',
);
assert(
  (confirmHtml.match(/<a [^>]*>\s*Abrir formulário\s*<\/a>/g) || []).length === 1,
  'confirmation has a single form button',
);
assert(
  collapseDuplicatePlaceholders(`{{botao_chamada}}<p>{{botao_chamada}}</p>{{botao_formulario}}{{botao_formulario}}`)
    === `${EMAIL_BOTAO_CHAMADA}<p></p>${EMAIL_BOTAO_FORMULARIO}`,
  'duplicate button tokens collapse to one each',
);
const dupConfirm = scheduleFormEmail({
  nome: 'Ana',
  whenLabel: 'terça',
  meetUrl: 'https://meet.google.com/abc-defg-hij',
  formUrl: 'https://miana.pt/diagnostico?token=xyz',
  copy: { subject: 'x', body: `${EMAIL_BOTAO_CHAMADA}<p>${EMAIL_BOTAO_CHAMADA}</p>${EMAIL_BOTAO_FORMULARIO}${EMAIL_BOTAO_FORMULARIO}` },
});
assert((dupConfirm.match(/<a [^>]*>\s*Entrar na Chamada\s*<\/a>/g) || []).length === 1, 'dirty copy still sends one Meet button');
assert((dupConfirm.match(/<a [^>]*>\s*Abrir formulário\s*<\/a>/g) || []).length === 1, 'dirty copy still sends one form button');
assert(confirmHtml.includes('contenteditable="false"'), 'confirmation template locks button labels in the editor');
assert(!stripEditorLocks(confirmHtml).includes('contenteditable'), 'outbound strip removes editor locks');

const resolvedEn = templateFromMap(
  { email_bridal_subject_en: 'Custom EN quote', email_bridal_body_en: '<p>Hi {{nome}}</p>{{bloco}}' },
  'bridal',
  EMAIL_COPY_FALLBACKS_EN.bridal,
  'en',
);
assert(resolvedEn.subject === 'Custom EN quote', 'EN subject from settings map');
assert(resolvedEn.body.includes('{{bloco}}'), 'EN body keeps {{bloco}}');

const resolvedEnFallback = templateFromMap({}, 'bridal', EMAIL_COPY_FALLBACKS_EN.bridal, 'en');
assert(resolvedEnFallback.subject === EMAIL_COPY_FALLBACKS_EN.bridal.subject, 'EN falls back when settings empty');

const resolvedPtIgnoresEn = templateFromMap(
  { email_bridal_subject_en: 'Custom EN quote', email_bridal_subject: 'Assunto PT' },
  'bridal',
  EMAIL_COPY_FALLBACKS.bridal,
  'pt',
);
assert(resolvedPtIgnoresEn.subject === 'Assunto PT', 'PT resolution ignores _en keys');

const enQuote = bridalEmail(
  { nome: 'Ana', data_casamento: '2026-10-15' },
  PRICING_FALLBACKS,
  undefined,
  EMAIL_COPY_FALLBACKS_EN.bridal,
  {
    email: 'hello@test.pt',
    instagram: 'https://instagram.com/bymarianapita',
    website: 'https://marianapita.pt',
    assetBase: 'https://marianapita.pt',
  },
  'en',
);
assert(enQuote.includes('Quote'), 'EN bridal block uses Quote');
assert(!enQuote.includes('Investimento'), 'EN bridal block has no Investimento');
assert(enQuote.includes('Total amount'), 'EN bridal block uses Total amount');
assert(!enQuote.includes('Wedding date'), 'EN bridal block has no wedding date row');
assert(!enQuote.includes('Trial date'), 'EN bridal block has no trial date row');

const enBlock = bridalBlock({ nome: 'Ana', data_casamento: '2026-10-15' }, PRICING_FALLBACKS, undefined, 'en');
assert(!bridalBlock({ servicos_procurados: 'Makeup' }, PRICING_FALLBACKS).includes('border-top'), 'price table has no divider line');
assert(!bridalBlock({ servicos_procurados: 'Makeup' }, PRICING_FALLBACKS).includes('border-bottom'), 'price table has no section line');
assert(enBlock.includes('Quote'), 'bridalBlock en quote title');
assert(enBlock.includes('to be calculated'), 'EN travel pending when empty');
assert(!enBlock.includes('Getting-ready location'), 'bridalBlock has no location row');
assert(diagnosticBlock('https://example.com/diagnostico', 'en').includes('Open skin assessment'), 'diagnosticBlock en button');
assert(diagnosticBlock('https://example.com/diagnostico', 'pt').includes('Abrir avaliação de pele'), 'diagnosticBlock pt button');

const withTravel = bridalQuoteTotal(
  { servicos_procurados: 'Makeup', guests_makeup: '1', valor_deslocacao: '40' },
  PRICING_FALLBACKS,
);
assert(parseTravelFee({ valor_deslocacao: '40.50' }) === 40.5, 'travel keeps cents');
assert(formatEuro(250, 'pt') === '250€' && formatEuro(250, 'en') === '250€', 'whole euros have no decimals');
assert(formatEuro(237.5, 'pt') === '237,50€', 'cents use comma in PT');
assert(formatEuro(237.5, 'en') === '237.50€', 'cents use dot in EN');
assert(withTravel.travel === 40, 'bridal travel parsed');
assert(withTravel.guestTotal > 0, 'bridal still computes guest total');
assert(withTravel.total === withTravel.bridePrice + 40, 'bridal total excludes guests');
assert(bridalBlock({ nome: 'Ana', valor_deslocacao: '40' }, PRICING_FALLBACKS).includes('Deslocação'), 'PT travel row');
assert(bridalBlock({ nome: 'Ana' }, PRICING_FALLBACKS).includes('a calcular'), 'empty travel shows pending');
assert(bridalQuoteTotal({ servicos_procurados: 'Makeup' }, PRICING_FALLBACKS).travel === 0, 'empty travel is 0 in total');

const withAddon = bridalQuoteTotal(
  { servicos_procurados: 'Makeup', addon_skin_call: 'Duo Call (Plano 6M)' },
  PRICING_FALLBACKS,
);
assert(withAddon.addonPrice === PRICING_FALLBACKS.skin_call.session2, 'addon maps Duo to session2');
assert(withAddon.total === withAddon.bridePrice + withAddon.addonPrice, 'bridal total includes addon');
assert(bridalBlock({ servicos_procurados: 'Makeup', addon_skin_call: 'Duo Call (Plano 6M)' }, PRICING_FALLBACKS).includes('Add-on Skin Call'), 'live addon row');
assert(!bridalBlock({ servicos_procurados: 'Makeup' }, PRICING_FALLBACKS).includes('Add-on Skin Call'), 'empty addon hidden on send');
assert(bridalBlock({ servicos_procurados: 'Makeup' }, PRICING_FALLBACKS, undefined, 'pt', true).includes('Add-on Skin Call'), 'preview keeps empty addon row');
assert(!bridalBlock({ guests_makeup: '2' }, PRICING_FALLBACKS).includes('Guests makeup'), 'bridal send has no guest rows');
assert(!bridalBlock({ guests_makeup: '2' }, PRICING_FALLBACKS, undefined, 'pt', true).includes('Guests makeup'), 'bridal preview has no guest rows');

const beautyNew = beautyQuoteTotal(
  { guests_makeup: '2', guests_hair: '1', guests_pack: '0' },
  PRICING_FALLBACKS,
);
assert(!beautyNew.legacy, 'beauty uses per-service when guests_* present');
assert(beautyNew.guests.makeup === 2 && beautyNew.guests.hair === 1, 'beauty guest counts');
assert(beautyNew.total === 2 * PRICING_FALLBACKS.beauty.makeup + PRICING_FALLBACKS.beauty.hair, 'beauty per-service total');

const beautyLegacy = beautyQuoteTotal(
  { servicos_procurados_guests: 'Makeup', numero_pessoas: '4' },
  PRICING_FALLBACKS,
);
assert(beautyLegacy.legacy, 'beauty falls back without guests_*');
assert(beautyLegacy.total === PRICING_FALLBACKS.beauty.makeup + 3 * PRICING_FALLBACKS.beauty.hair, 'beauty legacy extras');
assert(beautyBlock({ guests_makeup: '2' }, PRICING_FALLBACKS).includes('Guests makeup'), 'beauty block per-service rows');

const bridalSinal = reservationDeposit(
  'bridal',
  { servicos_procurados: 'Makeup', valor_deslocacao: '40', addon_skin_call: 'Duo Call (Plano 6M)' },
  PRICING_FALLBACKS,
);
assert(
  bridalSinal === 40 + PRICING_FALLBACKS.skin_call.session2 + PRICING_FALLBACKS.bridal.makeup / 2,
  'bridal deposit is travel + addon + half bride',
);
assert(
  reservationDeposit('bridal', { servicos_procurados: 'Pack' }, PRICING_FALLBACKS)
    === PRICING_FALLBACKS.bridal.pack / 2,
  'bridal pack deposit keeps half cents',
);
assert(
  reservationDeposit('beauty', { guests_makeup: '2' }, PRICING_FALLBACKS)
    === (2 * PRICING_FALLBACKS.beauty.makeup) / 2,
  'beauty deposit is half total',
);
assert(
  reservationDeposit('education', { valor_deslocacao: '20' }, PRICING_FALLBACKS)
    === (PRICING_FALLBACKS.education.workshop + 20) / 2,
  'education deposit is half total',
);
assert(reservationDeposit('skin-call', { plano: 'Duo Call (Plano 6M)' }, PRICING_FALLBACKS) === null, 'skin-call has no deposit');
assert(bridalBlock({ servicos_procurados: 'Makeup' }, PRICING_FALLBACKS).includes('Valor sinal'), 'PT deposit row under total');
assert(!bridalBlock({ servicos_procurados: 'Makeup' }, PRICING_FALLBACKS).includes('Data da prova'), 'PT bridal block has no trial date row');
assert(bridalBlock({ servicos_procurados: 'Makeup' }, PRICING_FALLBACKS).includes('font-size:20px'), 'bridal quote title is larger');
assert(beautyBlock({ guests_makeup: '2' }, PRICING_FALLBACKS).includes('font-size:20px'), 'beauty quote title is larger');
assert(bridalBlock({ servicos_procurados: 'Pack' }, PRICING_FALLBACKS).includes('237,50€'), 'PT pack deposit shows cents');
assert(bridalBlock({ servicos_procurados: 'Pack' }, PRICING_FALLBACKS, undefined, 'en').includes('237.50€'), 'EN pack deposit shows cents');
assert(bridalBlock({ servicos_procurados: 'Makeup' }, PRICING_FALLBACKS).includes('125€'), 'whole deposit has no decimals');
assert(bridalBlock({ servicos_procurados: 'Makeup' }, PRICING_FALLBACKS, undefined, 'en').includes('Deposit amount'), 'EN deposit row');
assert(!bridalBlock({ servicos_procurados: 'Makeup' }, PRICING_FALLBACKS, undefined, 'en').includes('Trial date'), 'EN bridal block has no trial date row');
assert(educationBlock({}, PRICING_FALLBACKS).includes('font-size:20px'), 'education quote title is larger');
assert(educationBlock({}, PRICING_FALLBACKS).includes('Valor sinal'), 'education block has deposit');
assert(!skinCallBlock({ plano: 'Duo Call (Plano 6M)' }, PRICING_FALLBACKS).includes('Valor sinal'), 'skin-call block has no deposit');
assert(!skinCallBlock({ plano: 'Duo Call (Plano 6M)', valor_deslocacao: '40' }, PRICING_FALLBACKS).includes('Deslocação'), 'skin-call block has no travel');
assert(!skinCallBlock({ plano: 'Duo Call (Plano 6M)' }, PRICING_FALLBACKS).includes('Valor total'), 'skin-call block has no total');
assert(!skinCallBlock({ plano: 'Duo Call (Plano 6M)' }, PRICING_FALLBACKS).includes('<h3'), 'skin-call block has no section title');
assert(skinCallBlock({ plano: 'Duo Call (Plano 6M)' }, PRICING_FALLBACKS).includes('<strong>Plano</strong>'), 'skin-call block has bold plan row');
assert(skinCallBlock({ plano: 'Duo Call (Plano 6M)' }, PRICING_FALLBACKS).includes('Duo Call (Plano 6M)'), 'skin-call block has plan name');
assert(skinCallBlock({ plano: 'Duo Call (Plano 6M)' }, PRICING_FALLBACKS).includes('<strong>Valor</strong>'), 'skin-call block has bold amount row');
assert(skinCallBlock({ plano: 'Duo Call (Plano 6M)' }, PRICING_FALLBACKS).includes(`${PRICING_FALLBACKS.skin_call.session2}€`), 'skin-call block has service price');
assert(skinCallBlock({ plano: 'Duo Call (Plano 6M)' }, PRICING_FALLBACKS, undefined, 'en').includes('<strong>Plan</strong>'), 'EN skin-call block has bold plan row');
assert(skinCallBlock({ plano: 'Duo Call (Plano 6M)' }, PRICING_FALLBACKS, undefined, 'en').includes('<strong>Amount</strong>'), 'EN skin-call block has bold amount row');
assert(skinCallBlock({}, PRICING_FALLBACKS, undefined, 'pt', true).includes('<strong>Plano</strong>'), 'skin-call preview keeps plan row');
assert(skinCallBlock({}, PRICING_FALLBACKS, undefined, 'pt', true).includes('<strong>Valor</strong>'), 'skin-call preview keeps amount row');
assert(!skinCallBlock({}, PRICING_FALLBACKS).includes('<strong>Plano</strong>'), 'skin-call send without plan has empty table');
assert(bridalIntroEmail({ servicos_procurados: 'Makeup' }, { subject: '', body: '<p>{{sinal_reserva}}</p>' }).includes('125€'), 'intro interpolates deposit');

const pdfBytes = new TextEncoder().encode('%PDF-1.4 placeholder');
assert(resolveOutgoingAttachmentType('servicos.pdf', 'application/pdf', pdfBytes) === 'application/pdf', 'pdf magic accepted');
assert(resolveOutgoingAttachmentType('fake.pdf', 'application/pdf', new Uint8Array([1, 2, 3, 4])) === null, 'pdf declared without magic rejected');
assert(!!validateOutgoingAttachment('nota.exe', 'application/octet-stream', new Uint8Array([1, 2, 3])), 'exe rejected');
const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0]);
assert(resolveOutgoingAttachmentType('foto.jpg', 'image/jpeg', jpeg) === 'image/jpeg', 'jpeg magic accepted');
assert(resolveOutgoingAttachmentType('foto.jpg', 'image/jpeg', new Uint8Array([1, 2, 3])) === null, 'jpeg declared without magic rejected');

assert(isCustomTemplateId('c_a1b2c3d4'), 'custom id matches c_ + 8 hex');
assert(!isCustomTemplateId('bridal') && !isCustomTemplateId('c_SHORT') && !isCustomTemplateId('c_ABCDEFGH'), 'rejects builtin and invalid custom ids');
assert(isBuiltinTemplateId('bridal_intro') && !isBuiltinTemplateId('c_a1b2c3d4'), 'builtin id guard');
assert(isCustomEmailFlow('bridal') && isCustomEmailFlow('skin-call') && !isCustomEmailFlow('shared'), 'custom flows');
assert(flowForLeadType('beauty') === 'beauty' && flowForLeadType('skin-call') === 'skin-call', 'lead type maps to flow');
assert(sanitizeCustomLabel('  <b>Follow-up</b>  ') === 'Follow-up', 'label strips html');
assert(sanitizeCustomLabel('') === '', 'empty label rejected after sanitize');
assert(sanitizeCustomLabel('x'.repeat(50)).length === 40, 'label max 40');
assert(CUSTOM_TEMPLATE_ID_RE.test(newCustomTemplateId()), 'generated id is valid');

const parsed = parseCustomRegistry(JSON.stringify([
  { id: 'c_a1b2c3d4', flow: 'bridal', label: 'Follow-up' },
  { id: 'bridal', flow: 'bridal', label: 'Nope' },
  { id: 'c_deadbeef', flow: 'shared', label: 'Bad flow' },
  { id: 'c_aaaaaaaa', flow: 'beauty', label: '<em>Hi</em>' },
  { id: 'c_a1b2c3d4', flow: 'education', label: 'Dup' },
]));
assert(parsed.length === 2 && parsed[0].id === 'c_a1b2c3d4' && parsed[0].label === 'Follow-up', 'parse keeps valid extras');
assert(parsed[1].label === 'Hi', 'parse sanitizes label');
assert(parseCustomRegistry('{"id":"c_a1b2c3d4"}').length === 0, 'non-array registry is empty');
assert(parseCustomRegistry(undefined).length === 0, 'missing registry is empty');
assert(parseCustomRegistry('not-json').length === 0, 'invalid json is empty');

const overflow = parseCustomRegistry(JSON.stringify(
  Array.from({ length: MAX_CUSTOM_TEMPLATES + 5 }, (_, i) => ({
    id: `c_${i.toString(16).padStart(8, '0')}`,
    flow: 'bridal',
    label: `Extra ${i}`,
  })),
));
assert(overflow.length === MAX_CUSTOM_TEMPLATES, 'parse caps at max extras');

const roundtrip = parseCustomRegistry(serializeCustomRegistry(parsed));
assert(roundtrip.length === 2 && roundtrip[1].flow === 'beauty', 'serialize roundtrip');
assert(customTemplatesForFlow(parsed, 'bridal').length === 1, 'filter extras by flow');
assert(fieldsForFlow('bridal').includes('sinal_reserva') && fieldsForFlow('bridal').includes('data_casamento') && fieldsForFlow('bridal').includes('data_prova'), 'bridal extra fields');
assert(fieldsForFlow('beauty').includes('sinal_reserva') && fieldsForFlow('education').includes('sinal_reserva'), 'beauty/education extras have sinal');
assert(!fieldsForFlow('skin-call').includes('sinal_reserva') && !fieldsForFlow('skin-call').includes('valor_deslocacao') && fieldsForFlow('skin-call').includes('rotina'), 'skin-call extras have no sinal or travel');
assert(!fieldsForFlow('bridal').includes('titular'), 'extras have no payment fields');
assert(customCopySettingKeys('c_a1b2c3d4').join(',') === 'email_c_a1b2c3d4_subject,email_c_a1b2c3d4_body,email_c_a1b2c3d4_subject_en,email_c_a1b2c3d4_body_en', 'custom copy keys PT+EN');
assert(customAttachmentSettingKeys('c_a1b2c3d4').join(',') === 'email_c_a1b2c3d4_attachments,email_c_a1b2c3d4_attachments_en', 'custom attachment keys PT+EN');

const customCopy = customTemplateFromMap({
  email_c_a1b2c3d4_subject: 'Olá {{nome}}',
  email_c_a1b2c3d4_body: '<p>PT</p>',
  email_c_a1b2c3d4_subject_en: 'Hi {{nome}}',
  email_c_a1b2c3d4_body_en: '<p>EN</p>',
}, 'c_a1b2c3d4', 'en');
assert(customCopy.subject === 'Hi {{nome}}' && customCopy.body === '<p>EN</p>', 'custom EN copy from map');
assert(customTemplateFromMap({}, 'c_a1b2c3d4', 'pt').subject === '', 'missing custom copy is empty');

assert(snapFontSize(15) === 16 && snapFontSize(12) === 13 && snapFontSize(19) === 20, 'font size snaps to 13/16/20');
assert(snapColor('rgb(138, 40, 49)') === '#8a2831', 'rgb snaps to brand hex');
assert(snapColor('#111111') === '#3b2a2a', 'off-palette color snaps to nearest');
assert(snapColor('#fbf5ef') === '#fbf5ef', 'button cream is kept');

const normalized = normalizeEmailBodyHtml(
  '<div>Alô {{nome}}</div><p style="font-size:15px;color:rgb(200,20,20)">Nota</p><font color="#00ff00">x</font>',
);
assert(normalized.includes('{{nome}}'), 'normalize keeps placeholders');
assert(normalized.includes('<p') && normalized.includes('Alô {{nome}}'), 'div paragraph becomes p');
assert(normalized.includes('font-size:16px'), '15px snaps to 16');
assert(normalized.includes('color:#8a2831'), 'red snaps to brand');
assert(!normalized.includes('<font'), 'font tags become spans');
assert(normalizeEmailBodyHtml('<div style="max-width:560px"><p>Hi</p></div>').includes('max-width:720px'), 'legacy 560 wrapper becomes 720');
assert(normalizeEmailBodyHtml('<h2>Valor</h2>').includes('<h3') && !normalizeEmailBodyHtml('<h2>Valor</h2>').includes('<h2'), 'h2 section titles become h3');
assert(normalizeEmailBodyHtml('<h2>Valor</h2>').includes('font-size:16px') && normalizeEmailBodyHtml('<h2>Valor</h2>').includes('font-weight:700'), 'section titles stay 16px bold');
assert(normalizeEmailBodyHtml('<h2>Alô Noiva {{nome}},</h2>').includes('<p') && !normalizeEmailBodyHtml('<h2>Alô Noiva {{nome}},</h2>').includes('<h3'), 'greeting heading becomes paragraph');

if (!process.exitCode) console.log('email-copy: all passed');
