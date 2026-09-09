import {
  fieldKind,
  formatFieldDisplay,
  renderEditableCard,
  visibleFormEntries,
} from '../worker/admin/inline-edit.ts';

function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error('FAIL', msg);
    process.exitCode = 1;
  } else {
    console.log('ok', msg);
  }
}

const BRIDAL_KEYS = [
  'servicos_procurados',
  'guests_makeup',
  'guests_hair',
  'guests_pack',
  'addon_skin_call',
];

const emptyBridal = Object.fromEntries(visibleFormEntries('bridal', {}));
assert(emptyBridal.data_prova === '', 'bridal empty profile has data_prova');
for (const key of BRIDAL_KEYS) {
  assert(emptyBridal[key] === '', `bridal empty profile has ${key}`);
}

const fromForm = Object.fromEntries(
  visibleFormEntries('bridal', {
    opcao_servico: 'Bride',
    data_casamento: '2026-10-15',
    hora_pronta: '09:00',
    local_preparacao: 'Hotel',
    local_prova: 'Salao',
    mensagem: 'Olá',
  })
);
assert(fromForm.data_casamento === '2026-10-15', 'keeps submitted bridal fields');
assert(fromForm.data_prova === '', 'injects empty data_prova');
assert(
  Object.keys(fromForm).indexOf('data_prova') === Object.keys(fromForm).indexOf('local_prova') + 1,
  'data_prova sits after local_prova',
);
assert(fromForm.servicos_procurados === '', 'injects empty servicos_procurados');
assert(fromForm.guests_makeup === '', 'injects empty guests_makeup');
assert(fromForm.guests_hair === '', 'injects empty guests_hair');
assert(fromForm.guests_pack === '', 'injects empty guests_pack');
assert(fromForm.addon_skin_call === '', 'injects empty addon_skin_call');

const filled = Object.fromEntries(
  visibleFormEntries('bridal', {
    guests_makeup: '2',
    guests_hair: '1',
    guests_pack: '0',
    servicos_procurados: 'Makeup',
    addon_skin_call: 'Duo Call (Plano 6M)',
  })
);
assert(filled.guests_makeup === '2', 'keeps guests_makeup');
assert(filled.servicos_procurados === 'Makeup', 'keeps servicos_procurados');
assert(filled.addon_skin_call === 'Duo Call (Plano 6M)', 'keeps addon plan');

const orderedKeys = visibleFormEntries('bridal', {
  addon_skin_call: 'Duo Call (Plano 6M)',
  data_casamento: '2026-10-15',
  servicos_procurados: 'Makeup',
}).map(([key]) => key);
assert(
  orderedKeys.slice(-6, -1).join(',') === BRIDAL_KEYS.join(','),
  'bridal profile keys stay grouped before travel'
);
assert(orderedKeys.at(-1) === 'valor_deslocacao', 'travel fee is last common field');

const beauty = Object.fromEntries(visibleFormEntries('beauty', { numero_pessoas: '4' }));
assert(beauty.numero_pessoas === '4', 'beauty keeps own fields');
assert(beauty.guests_makeup === '', 'beauty injects empty guests_makeup');
assert(beauty.guests_hair === '', 'beauty injects empty guests_hair');
assert(beauty.guests_pack === '', 'beauty injects empty guests_pack');
assert(beauty.valor_deslocacao === '', 'beauty injects empty travel fee');
assert(!('servicos_procurados' in beauty), 'beauty omits bride service');
assert(!('addon_skin_call' in beauty), 'beauty omits addon plan');
assert(!('data_prova' in beauty), 'beauty omits trial date');

assert(!('valor_deslocacao' in Object.fromEntries(visibleFormEntries('skin-call', { valor_deslocacao: '40' }))), 'skin-call has no travel fee');
assert(Object.fromEntries(visibleFormEntries('education', {})).valor_deslocacao === '', 'education has travel fee');
assert(fieldKind('valor_deslocacao') === 'number', 'travel fee is a number');

assert(formatFieldDisplay('addon_skin_call', '') === '-', 'empty addon displays as -');
assert(formatFieldDisplay('guests_makeup', '') === '-', 'empty guests displays as -');
assert(fieldKind('servicos_procurados') === 'select', 'bride service is a select');
assert(fieldKind('addon_skin_call') === 'select', 'addon plan is a select');
assert(fieldKind('guests_makeup') === 'number', 'guest counts are numbers');

const card = renderEditableCard({
  id: 'card-lead-form',
  title: 'Dados do Formulário',
  fields: visibleFormEntries('bridal', {}).map(([key, value]) => ({ key, value })),
  editable: true,
  saveUrl: '/api/admin/lead/1',
  saveKind: 'form-lead',
  originalJson: {},
});
assert(card.includes('name="data_prova"'), 'card has trial date');
assert(card.includes('name="servicos_procurados"'), 'card has bride service control');
assert(card.includes('name="guests_makeup"'), 'card has guests makeup');
assert(card.includes('name="addon_skin_call"'), 'card has addon plan');
assert(card.includes('One Time Call (Plano 3M)'), 'addon select has One Time');
assert(card.includes('Duo Call (Plano 6M)'), 'addon select has Duo');
assert(card.includes('Triple Call (Plano 9M)'), 'addon select has Triple');
assert(card.includes('Full Year Call (Plano 12M)'), 'addon select has Full Year');
assert(card.includes('>-<'), 'empty select option is -');
