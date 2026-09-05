import {
  extractEmailAddress,
  parsePlusConversationId,
  normalizeMessageId,
  isInternalFrom,
  isOwnerNotificationSubject,
  splitReferences,
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

if (!process.exitCode) console.log('email-match: all passed');
