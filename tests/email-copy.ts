import {
  bodyFromEditor,
  EMAIL_BLOCO,
  EMAIL_COPY_FALLBACKS,
  EMAIL_COPY_SETTING_KEYS,
  EMAIL_FLOW_GROUPS,
  EMAIL_FLOW_REGISTRY,
  EMAIL_TEMPLATE_IDS,
  settingsEmailEntries,
  settingsPanelId,
  fillTemplateBody,
  interpolate,
  previewTemplateBody,
  templateFromMap,
  templateVars,
  textToHtml,
} from '../worker/email-copy.ts';
import { EMAIL_COPY_FALLBACKS_EN } from '../worker/email-copy-en.ts';
import { bridalBlock, diagnosticBlock } from '../worker/templates/blocks.ts';
import { parseLocale } from '../worker/locale.ts';
import { bridalEmail } from '../worker/templates/bridal.ts';
import { bridalIntroEmail } from '../worker/templates/bridal_intro.ts';
import { emailSignatureHtml, wrapEmail } from '../worker/templates/base.ts';
import { bridalServicesPlaceholderPdf, BRIDAL_SERVICES_PLACEHOLDER_FILENAME } from '../worker/assets/bridal-services-placeholder.ts';
import { PRICING_FALLBACKS } from '../worker/pricing.ts';

function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error('FAIL', msg);
    process.exitCode = 1;
  } else {
    console.log('ok', msg);
  }
}

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
assert(preview.includes('TABELA'), 'preview shows generated table');
assert(preview.includes('<p>Fecho</p>'), 'preview keeps closing copy');
assert(bodyFromEditor(preview) === '<h2>Orçamento</h2>{{bloco}}<p>Fecho</p>', 'editor save restores placeholder');

const filled = fillTemplateBody('<p>Olá {{nome}}</p>{{bloco}}', '<p>Preços</p>', { nome: 'Ana' });
assert(filled.includes('Olá Ana'), 'fill interpolates nome');
assert(filled.includes('Preços'), 'fill injects live block');
assert(!filled.includes('{{bloco}}'), 'fill removes placeholder');

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
assert(quoteHtml.includes('Investimento'), 'generated price block stays');
assert(!quoteHtml.includes('<script>'), 'no raw script from copy');
assert(!quoteHtml.includes('{{bloco}}'), 'sent email has no placeholder');

const vars = templateVars(
  { nome: 'Ana', data_casamento: '2026-10-15' },
  { quando: 'terça' },
);
assert(vars.nome === 'Ana' && vars.data_casamento === '2026-10-15' && vars.quando === 'terça', 'templateVars merges fields');
const withDate = fillTemplateBody(
  '<p>Casamento em {{data_casamento}}</p>{{bloco}}',
  '<p>ok</p>',
  vars,
);
assert(withDate.includes('Casamento em 2026-10-15'), 'fill interpolates form fields');

assert(EMAIL_COPY_SETTING_KEYS.includes('email_bridal_intro_subject'), 'settings key subject');
assert(EMAIL_COPY_SETTING_KEYS.includes('email_bridal_intro_body'), 'settings key body');
assert(!EMAIL_COPY_FALLBACKS.bridal_intro.body.includes('{{bloco}}'), 'intro has no bloco');
assert(EMAIL_FLOW_REGISTRY.some((e) => e.id === 'bridal_intro' && e.flow === 'bridal' && e.step === 'intro'), 'registry bridal intro');
const settingsEntries = settingsEmailEntries();
assert(settingsEntries.every((e) => e.audience !== 'system'), 'settings entries hide system mails');
assert(settingsEntries.some((e) => e.id === 'terms') && settingsEntries.some((e) => e.id === 'signature'), 'shared terms and signature');
assert(settingsPanelId('signature') === 'footer', 'signature panel id');
assert(EMAIL_FLOW_GROUPS.map((g) => g.id).join(',') === 'shared,bridal,beauty,skin-call,education', 'settings flow order');
assert(
  settingsEntries.every((e) => EMAIL_FLOW_GROUPS.some((g) => g.id === e.flow)),
  'every settings entry belongs to a flow group',
);

const introHtml = bridalIntroEmail(
  {
    nome: 'Ana',
    data_casamento: '2026-10-15',
    local_preparacao: 'Hotel Pestana',
    hora_pronta: '14:00',
  },
  EMAIL_COPY_FALLBACKS.bridal_intro,
  {
    email: 'hello@test.pt',
    instagram: 'https://instagram.com/bymarianapita',
    website: 'https://marianapita.pt',
    assetBase: 'https://marianapita.pt',
  },
);
assert(introHtml.includes('Alô Noiva Ana!!!'), 'intro interpolates nome');
assert(introHtml.includes('2026-10-15'), 'intro interpolates wedding date');
assert(introHtml.includes('Hotel Pestana'), 'intro interpolates prep location');
assert(introHtml.includes('14:00'), 'intro interpolates ready time');
assert(!introHtml.includes('{{nome}}'), 'intro leaves no nome placeholder');
assert(!introHtml.includes('{{bloco}}'), 'intro sent html has no bloco');
assert(introHtml.includes('/email/assinatura.png'), 'intro has signature');
assert((introHtml.match(/\/email\/assinatura\.png/g) || []).length === 1, 'intro wraps signature once');

const footer = {
  email: 'hello@test.pt',
  instagram: 'https://instagram.com/bymarianapita',
  website: 'https://marianapita.pt',
  assetBase: 'https://marianapita.pt',
};
const sig = emailSignatureHtml(footer);
assert(sig.includes('align="left"'), 'signature cells are left aligned');
assert(!sig.includes('margin:16px auto'), 'signature is not centered');
assert(!sig.includes('align="center"'), 'signature has no center align');
assert((wrapEmail('<p>Corpo</p>', footer).match(/\/email\/assinatura\.png/g) || []).length === 1, 'wrapEmail adds one signature');

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
  assert(!!EMAIL_COPY_FALLBACKS_EN[id].subject, `EN subject for ${id}`);
  assert(!!EMAIL_COPY_FALLBACKS_EN[id].body, `EN body for ${id}`);
}
assert(EMAIL_COPY_FALLBACKS_EN.bridal.body.includes(EMAIL_BLOCO), 'EN bridal has {{bloco}}');
assert(EMAIL_COPY_FALLBACKS_EN.beauty.body.includes(EMAIL_BLOCO), 'EN beauty has {{bloco}}');
assert(EMAIL_COPY_FALLBACKS_EN.skin_call.body.includes(EMAIL_BLOCO), 'EN skin_call has {{bloco}}');
assert(EMAIL_COPY_FALLBACKS_EN.education.body.includes(EMAIL_BLOCO), 'EN education has {{bloco}}');
assert(EMAIL_COPY_FALLBACKS_EN.terms.body.includes(EMAIL_BLOCO), 'EN terms has {{bloco}}');
assert(EMAIL_COPY_FALLBACKS_EN.schedule_form.body.includes(EMAIL_BLOCO), 'EN schedule_form has {{bloco}}');
assert(EMAIL_COPY_FALLBACKS_EN.diagnostic_invite.body.includes(EMAIL_BLOCO), 'EN diagnostic_invite has {{bloco}}');
assert(!EMAIL_COPY_FALLBACKS_EN.bridal_intro.body.includes(EMAIL_BLOCO), 'EN intro has no {{bloco}}');
assert(!EMAIL_COPY_FALLBACKS_EN.schedule.body.includes(EMAIL_BLOCO), 'EN schedule has no {{bloco}}');
assert(EMAIL_COPY_SETTING_KEYS.includes('email_bridal_subject_en'), 'settings key EN subject');
assert(EMAIL_COPY_SETTING_KEYS.includes('email_bridal_body_en'), 'settings key EN body');

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
assert(enQuote.includes('Investment'), 'EN bridal block uses Investment');
assert(!enQuote.includes('Investimento'), 'EN bridal block has no Investimento');
assert(enQuote.includes('Details'), 'EN bridal block uses Details');

const enBlock = bridalBlock({ nome: 'Ana', data_casamento: '2026-10-15' }, PRICING_FALLBACKS, undefined, 'en');
assert(enBlock.includes('Investment'), 'bridalBlock en investment');
assert(diagnosticBlock('https://example.com/diagnostico', 'en').includes('Open diagnostic'), 'diagnosticBlock en button');
assert(diagnosticBlock('https://example.com/diagnostico', 'pt').includes('Abrir diagnóstico'), 'diagnosticBlock pt button');

if (!process.exitCode) console.log('email-copy: all passed');
