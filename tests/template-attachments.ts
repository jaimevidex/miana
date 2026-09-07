import {
  attachmentsSettingKey,
  defaultTemplateAttachments,
  isAttachmentsSettingKey,
  isEmailTemplateId,
  isSafeTemplateAttachmentKey,
  listTemplateAttachmentsFromMap,
  parseAttachmentList,
  publicAttachmentList,
  quoteTemplateId,
  serializeAttachmentList,
  termsTemplateId,
  BUILTIN_BRIDAL_SERVICES,
  BUILTIN_TERMOS,
} from '../worker/template-attachments.ts';
import { TERMOS_PLACEHOLDER_FILENAME } from '../worker/assets/termos-placeholder.ts';
import { BRIDAL_SERVICES_PLACEHOLDER_FILENAME } from '../worker/assets/bridal-services-placeholder.ts';

function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error('FAIL', msg);
    process.exitCode = 1;
  } else {
    console.log('ok', msg);
  }
}

assert(attachmentsSettingKey('bridal_intro', 'pt') === 'email_bridal_intro_attachments', 'PT attachments key');
assert(attachmentsSettingKey('bridal_intro', 'en') === 'email_bridal_intro_attachments_en', 'EN attachments key');
assert(isAttachmentsSettingKey('email_bridal_terms_attachments'), 'detects PT attachments key');
assert(isAttachmentsSettingKey('email_bridal_terms_attachments_en'), 'detects EN attachments key');
assert(!isAttachmentsSettingKey('email_bridal_terms_body'), 'copy keys are not attachments');
assert(isEmailTemplateId('bridal_intro') && isEmailTemplateId('schedule_form'), 'known template ids');
assert(!isEmailTemplateId('quote') && !isEmailTemplateId('terms'), 'chat kinds are not template ids');
assert(quoteTemplateId('skin-call') === 'skin_call', 'quote id for skin-call');
assert(termsTemplateId('beauty') === 'beauty_terms', 'terms id for beauty');

const introDefaults = defaultTemplateAttachments('bridal_intro');
assert(introDefaults.length === 1 && introDefaults[0].id === BUILTIN_BRIDAL_SERVICES, 'intro default is bridal PDF');
assert(introDefaults[0].filename === BRIDAL_SERVICES_PLACEHOLDER_FILENAME, 'intro default filename');
assert(defaultTemplateAttachments('bridal_terms')[0].id === BUILTIN_TERMOS, 'terms default is termos PDF');
assert(defaultTemplateAttachments('bridal_terms')[0].filename === TERMOS_PLACEHOLDER_FILENAME, 'terms default filename');
assert(defaultTemplateAttachments('beauty').length === 0, 'quote has no default attachment');
assert(defaultTemplateAttachments('schedule').length === 0, 'schedule has no default attachment');

assert(parseAttachmentList(undefined, 'bridal_intro', false)[0].id === BUILTIN_BRIDAL_SERVICES, 'missing key uses default');
assert(parseAttachmentList('[]', 'bridal_intro', true).length === 0, 'empty saved list stays empty');
assert(parseAttachmentList('[]', 'bridal_terms', true).length === 0, 'removed terms PDF stays removed');

const saved = parseAttachmentList(
  serializeAttachmentList([
    { id: BUILTIN_TERMOS, filename: TERMOS_PLACEHOLDER_FILENAME, contentType: 'application/pdf', size: 10 },
    { id: 'abc', filename: 'extra.pdf', contentType: 'application/pdf', size: 20, r2Key: 'template-attachments/bridal_terms/pt/abc-extra.pdf' },
  ]),
  'bridal_terms',
  true,
);
assert(saved.length === 2, 'parses builtin + uploaded');
assert(saved[0].id === BUILTIN_TERMOS && saved[1].filename === 'extra.pdf', 'hydrates mixed list');
assert(!publicAttachmentList(saved)[1].r2Key, 'public list hides r2 key');

const fromMap = listTemplateAttachmentsFromMap({}, 'bridal_intro', 'en');
assert(fromMap[0].id === BUILTIN_BRIDAL_SERVICES, 'EN missing key still seeds bridal PDF');
const clearedEn = listTemplateAttachmentsFromMap({ email_bridal_intro_attachments_en: '[]' }, 'bridal_intro', 'en');
assert(clearedEn.length === 0, 'EN empty list does not restore default');
assert(listTemplateAttachmentsFromMap({}, 'bridal', 'pt').length === 0, 'quote missing key is empty');

assert(isSafeTemplateAttachmentKey('template-attachments/bridal/pt/id-file.pdf'), 'safe template key');
assert(!isSafeTemplateAttachmentKey('email-attachments/x'), 'rejects other folder');
assert(!isSafeTemplateAttachmentKey('template-attachments/../secret'), 'rejects traversal');

if (!process.exitCode) console.log('template-attachments: all passed');
