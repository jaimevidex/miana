import {
  extractEmailAddress,
  parsePlusConversationId,
  normalizeMessageId,
  isInternalFrom,
  isOwnerNotificationSubject,
  splitReferences,
  stripSubjectPrefixes,
  threadReplySubject,
  resolveConversationSubject,
  buildReplyHeaders,
  formatRfcMessageId,
  isSyntheticMessageId,
  pickThreadParent,
} from '../worker/email-match.ts';

function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error('FAIL', msg);
    process.exitCode = 1;
  } else {
    console.log('ok', msg);
  }
}

assert(extractEmailAddress('Mariana <hello@marianapita.pt>') === 'hello@marianapita.pt', 'extract angle');
assert(
  parsePlusConversationId('hello+aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa@marianapita.pt') ===
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'plus uuid',
);
assert(normalizeMessageId('<Msg.ID@mail.marianapita.pt>') === 'msg.id@mail.marianapita.pt', 'normalize id');
assert(isInternalFrom('hello@marianapita.pt', 'hello@marianapita.pt'), 'internal from');
assert(isOwnerNotificationSubject('🔔 Novo Pedido - Bridal'), 'owner subject');
assert(splitReferences('<a@x> <b@x>').length === 2, 'references split');
assert(!parsePlusConversationId('hello@marianapita.pt'), 'no plus');

assert(stripSubjectPrefixes('Re: Orçamento - Bridal') === 'Orçamento - Bridal', 'strip Re');
assert(stripSubjectPrefixes('RE: Re: Termos - Bridal') === 'Termos - Bridal', 'strip stacked Re');
assert(threadReplySubject('Orçamento - Bridal') === 'Re: Orçamento - Bridal', 'reply subject');
assert(threadReplySubject('Re: Orçamento - Bridal') === 'Re: Orçamento - Bridal', 'reply subject already prefixed');
assert(resolveConversationSubject('Teste', 'Orçamento - Bridal') === 'Re: Orçamento - Bridal', 'follow-up keeps thread subject');
assert(resolveConversationSubject('Orçamento - Bridal', null) === 'Orçamento - Bridal', 'first message uses provided subject');
assert(resolveConversationSubject('', 'Introdutório Bridal') === 'Re: Introdutório Bridal', 'empty follow-up subject still threads');

const headers = buildReplyHeaders({
  rfcMessageId: '<msg.aaa@mail.marianapita.pt>',
  referencesHeader: '<msg.root@mail.marianapita.pt>',
});
assert(headers.inReplyTo === '<msg.aaa@mail.marianapita.pt>', 'in-reply-to last id');
assert(headers.references === '<msg.root@mail.marianapita.pt> <msg.aaa@mail.marianapita.pt>', 'references chain');
assert(!buildReplyHeaders({ rfcMessageId: null }).inReplyTo, 'no headers without previous id');
assert(formatRfcMessageId('abc@resend.dev') === '<abc@resend.dev>', 'wrap message id');
assert(formatRfcMessageId('<abc@resend.dev>') === '<abc@resend.dev>', 'keep wrapped message id');
assert(isSyntheticMessageId('<msg.108408f0-6e65-4d6e-9108-d66a486a0d2e@mail.marianapita.pt>'), 'synthetic local id');
assert(!isSyntheticMessageId('<111-222-333@email.resend.dev>'), 'resend id is not synthetic');

const parent = pickThreadParent([
  { rfcMessageId: '<a@x>', subject: 'Orçamento - Bridal' },
  { rfcMessageId: '<b@x>', subject: 'Teste' },
], 'Orçamento - Bridal');
assert(parent?.rfcMessageId === '<a@x>', 'reply to last message with the thread subject');
assert(pickThreadParent([
  { rfcMessageId: '<z@x>', subject: 'Livre' },
], 'Orçamento - Bridal')?.rfcMessageId === '<z@x>', 'fallback to last id when subjects differ');

if (!process.exitCode) console.log('email-match: all passed');
