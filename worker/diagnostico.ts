// Página privada `/diagnostico` — formulário multi-página server-rendered a partir do token.
import type { Env } from './lib';
import type { DiagnosticLead } from './lib';
import { htmlEscape } from './lib';
import { siteUrl } from './config';

// ─── CSS partilhado ──────────────────────────────────────────────────────────
const CSS = `
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;background:#f6f0ea;color:#3b2a2a;margin:0;padding:0;line-height:1.6}
.wrap{max-width:720px;margin:0 auto;padding:24px 16px 48px}
.card{background:#fff;border:1px solid rgba(59,42,42,.08);border-radius:16px;padding:32px 28px;box-shadow:0 12px 40px rgba(59,42,42,.06)}
h1{font-size:26px;margin:0 0 8px;color:#8a2831}
h2{font-size:20px;margin:28px 0 12px;color:#8a2831;border-bottom:1px solid #e5ded7;padding-bottom:8px}
h3{font-size:16px;margin:20px 0 8px;color:#3b2a2a;font-weight:600}
p.sub{color:#7a6a64;font-size:14px;margin:0 0 24px}
p.hint{color:#8a7a74;font-size:12.5px;margin:4px 0 0;font-style:italic}
.lbl{display:block;font-size:14px;font-weight:600;color:#3b2a2a;margin-bottom:2px}
.req{color:#8a2831}
.in,textarea{border:1.5px solid #e5ded7;border-radius:12px;padding:14px 16px;font-size:15px;box-sizing:border-box;width:100%;background:#fff;transition:border-color .15s,box-shadow .15s;color:#3b2a2a}
.in:focus,textarea:focus{border-color:#8a2831;box-shadow:0 0 0 4px rgba(138,40,49,.10);outline:none}
.in::placeholder,textarea::placeholder{color:#b4a8a1;font-family:inherit;font-weight:400;font-style:normal;opacity:1}
textarea{resize:vertical;min-height:100px;line-height:1.7}
.grid{display:grid;gap:20px}
.opt{display:inline-flex;align-items:flex-start;gap:12px;font-size:14px;background:#fff;border:1.5px solid #e5ded7;border-radius:12px;padding:13px 16px;margin-bottom:8px;cursor:pointer;width:100%;box-sizing:border-box;transition:border-color .15s,background .15s}
.opt:hover{border-color:#8a2831;background:#fbf6f2}
.opt input{margin-top:3px;accent-color:#8a2831}
fieldset{border:0;padding:0;margin:0}
fieldset .lbl{margin-bottom:8px}
.progress{display:flex;gap:8px;margin-bottom:24px}
.progress .dot{flex:1;height:4px;border-radius:2px;background:#e5ded7;transition:background .3s}
.progress .dot.active{background:#8a2831}
.progress .dot.done{background:#0a7a4a}
.btn{display:inline-block;background:#8a2831;color:#fbf5ef;padding:15px 36px;font-size:15px;font-weight:600;border:0;border-radius:999px;cursor:pointer;transition:background .15s}
.btn:hover{background:#6f2027}
.btn:disabled{opacity:.5;cursor:not-allowed}
.btn-row{display:flex;gap:12px;margin-top:24px;flex-wrap:wrap}
.btn-outline{background:transparent;color:#8a2831;border:1.5px solid #8a2831}
.btn-outline:hover{background:#8a2831;color:#fbf5ef}
.status{margin-top:12px;font-size:13px}
.status.err{color:#b3261e}
.done{display:none;text-align:center;padding:40px 24px}
.done h2{font-size:22px;color:#0a7a4a;margin:0 0 8px}
.done p{color:#7a6a64;font-size:14px;margin:0}
.photos-note{font-size:12px;color:#8a7a74;margin-top:8px}
.file-group{margin-top:8px}
.file-group label{display:block;font-size:13px;color:#7a6a64;margin-bottom:4px}
.file-group input[type=file]{font-size:14px}
`;

// ─── Helpers ─────────────────────────────────────────────────────────────────
function checkboxOpts(name: string, opts: string[], selected: string[] = []): string {
  return opts.map((o) => {
    const checked = selected.includes(o) ? 'checked' : '';
    return `<label class="opt"><input type="checkbox" name="${name}" value="${htmlEscape(o)}" ${checked} class="accent-burgundy" /> <span>${htmlEscape(o)}</span></label>`;
  }).join('\n');
}

function radioOpts(name: string, opts: string[], selected: string = ''): string {
  return opts.map((o) => {
    const checked = selected === o ? 'checked' : '';
    return `<label class="opt"><input type="radio" name="${name}" value="${htmlEscape(o)}" ${checked} required class="accent-burgundy" /> <span>${htmlEscape(o)}</span></label>`;
  }).join('\n');
}

function textareaField(id: string, name: string, label: string, value: string, placeholder: string = ''): string {
  return `<div>
    <label class="lbl" for="${id}">${htmlEscape(label)} <span class="req">*</span></label>
    <textarea id="${id}" name="${name}" required class="in" placeholder="${htmlEscape(placeholder)}">${htmlEscape(value)}</textarea>
  </div>`;
}

function inputField(id: string, name: string, label: string, value: string, type: string = 'text', placeholder: string = ''): string {
  return `<div>
    <label class="lbl" for="${id}">${htmlEscape(label)} <span class="req">*</span></label>
    <input id="${id}" name="${name}" type="${type}" required value="${htmlEscape(value)}" class="in" placeholder="${htmlEscape(placeholder)}" />
  </div>`;
}

function progressDots(current: number, total: number): string {
  return `<div class="progress">${Array.from({ length: total }, (_, i) =>
    `<div class="dot ${i < current ? 'done' : ''} ${i === current - 1 ? 'active' : ''}"></div>`
  ).join('')}</div>`;
}

// ─── HTML Shell ──────────────────────────────────────────────────────────────
function htmlShell(title: string, content: string, script: string = ''): string {
  return `<!doctype html>
<html lang="pt">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="robots" content="noindex, nofollow" />
  <title>${htmlEscape(title)} — Skin Call</title>
  <style>${CSS}</style>
</head>
<body>
  <main class="wrap card">${content}</main>
  ${script ? `<script>${script}</script>` : ''}
</body>
</html>`;
}

// ─── Página 1: Identificação + Histórico + Histórico Dermatológico ───────────
function renderPage1(lead: DiagnosticLead): string {
  const nome = htmlEscape(lead.nome);
  const email = htmlEscape(lead.email);
  const telefone = htmlEscape(lead.telefone);

  const content = `
    ${progressDots(1, 3)}
    <h1>Análise da tua Pele</h1>
    <p class="sub">Para que a nossa chamada seja o mais proveitosa possível, precisas de preencher este formulário detalhado. Todas as informações serão usadas exclusivamente para analisar a tua pele e rotina, sendo confidenciais.</p>

    <form id="form-diag" class="grid" novalidate>
      <input type="hidden" name="token" value="${lead.token}" />
      <input type="hidden" name="_page" value="1" />

      <h2>Identificação</h2>
      ${inputField('diag-nome', 'nome', 'Nome Completo', lead.nome)}
      ${inputField('diag-idade', 'idade', 'Idade', '', 'number', 'Ex: 28')}
      ${inputField('diag-telefone', 'telefone', 'Contacto Telefónico', lead.telefone, 'tel')}
      ${inputField('diag-email', 'email', 'Email', lead.email, 'email')}

      <h2>Histórico</h2>
      <fieldset>
        <legend class="lbl">Encontras-te nalguma destas situações? <span class="req">*</span></legend>
        <div class="grid" style="margin-top:8px">
          ${checkboxOpts('situacao', [
            'Grávida',
            'Tive bebé nos últimos 12 meses',
            'A amamentar',
            'A planear engravidar',
            'Nenhuma das anteriores',
          ])}
        </div>
      </fieldset>

      ${textareaField('diag-doenca', 'doenca_cronica', 'Tens alguma doença ou condição crónica diagnosticada?', '', 'Descreve se aplicável...')}
      ${textareaField('diag-alergias-alim', 'alergias_alimentares', 'Tens Alergias ou Intolerâncias Alimentares conhecidas?', '', 'Descreve se aplicável...')}
      ${textareaField('diag-alergias-cosm', 'alergias_cosmeticos', 'Tens Alergias conhecidas a ingredientes cosméticos, medicamentos ou substâncias?', '', 'Descreve se aplicável...')}
      ${textareaField('diag-medicacao', 'medicacao_continua', 'Tomas alguma medicação contínua?', '', 'Descreve se aplicável...')}

      <h2>Histórico Dermatológico</h2>
      <fieldset>
        <legend class="lbl">Tens algum DIAGNÓSTICO MÉDICO para alguma destas condições? <span class="req">*</span></legend>
        <div class="grid" style="margin-top:8px">
          ${checkboxOpts('diagnostico_medico', [
            'Acne',
            'Rosácea',
            'Dermatite (Atópica, Seborreica, Perioral ou de Contacto)',
            'Eczema',
            'Psoríase',
            'Melasma',
            'Lúpus ou outra doença autoimune com manifestação cutânea',
            'Nenhum / Nunca fui diagnosticada com doenças de pele',
          ])}
        </div>
      </fieldset>
      ${textareaField('diag-diag-outro', 'diagnostico_outro', 'Outro diagnóstico médico:', '', 'Especifica se aplicável...')}
      ${textareaField('diag-medicacao-oral', 'medicacao_oral', 'Já fizeste medicação oral para a pele no passado? Se sim, qual?', '', 'Descreve...')}
      ${textareaField('diag-medicacao-topica', 'medicacao_topica', 'Já usaste medicação tópica para a pele no passado? Se sim, qual? Como reagiu a tua pele?', '', 'Ex: Tretinoína, Ketrel, Differin, Ácido Azelaico de farmácia...')}
      ${textareaField('diag-tratamentos', 'tratamentos_esteticos', 'Fizeste tratamentos estéticos/dermatológicos nos últimos 6 meses ou tiveste alguma má experiência em gabinete?', '', 'Ex: Peelings químicos, Microagulhamento, Laser, Botox...')}
      ${textareaField('diag-burnout', 'burnout_cutaneo', 'Já tiveste episódios de "burnout" cutâneo ou reações graves após usar algum produto? Se sim, qual foi o produto?', '', 'Sensação de queimadura, vermelhidão extrema ou escamação...')}

      <fieldset>
        <legend class="lbl">Tens pequenos vasos sanguíneos visíveis no rosto? <span class="req">*</span></legend>
        <p class="hint">Ex: nas abas do nariz, maçãs do rosto ou queixo</p>
        <div class="grid" style="margin-top:8px">
          ${radioOpts('vasos_visiveis', ['Sim', 'Não'])}
        </div>
      </fieldset>

      <fieldset>
        <legend class="lbl">Sentes que a tua pele "ruboriza" (fica vermelha e quente) subitamente? <span class="req">*</span></legend>
        <p class="hint">Ex: Com comidas picantes, bebidas alcoólicas, banhos quentes, mudanças de temperatura ou emoções</p>
        <div class="grid" style="margin-top:8px">
          ${radioOpts('rubor', ['Sim', 'Não'])}
        </div>
      </fieldset>

      ${textareaField('diag-reacao-estacoes', 'reacao_estacoes', 'Como reage a tua pele às mudanças de estação?', '', 'Ex: No inverno escama/seca, no verão fica incontrolavelmente oleosa...')}

      <div class="btn-row">
        <button type="submit" class="btn">Próxima →</button>
      </div>
      <p id="diag-status" class="status" role="status" aria-live="polite"></p>
    </form>`;

  const script = `
    const form = document.getElementById('form-diag');
    const status = document.getElementById('diag-status');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      // Validar campos obrigatórios
      let valid = true;
      form.querySelectorAll('[required]').forEach((el) => {
        if (el.type === 'checkbox' || el.type === 'radio') {
          const group = form.querySelectorAll('input[name="' + el.name + '"]:checked');
          if (group.length === 0) { valid = false; }
        } else if (!(el.value || '').trim()) {
          valid = false;
          el.style.borderColor = '#b3261e';
        }
      });
      if (!valid) { status.textContent = 'Faltam alguns campos obrigatórios.'; status.className = 'status err'; return; }
      status.textContent = 'A guardar...';
      const fd = new FormData(form);
      const data = {};
      fd.forEach((v, k) => {
        if (k === 'token' || k === '_page') return;
        if (!data[k]) data[k] = [];
        data[k].push(v);
      });
      const token = fd.get('token');
      try {
        const res = await fetch('/api/diagnostico/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token, page: 1, data }),
        });
        const r = await res.json();
        if (r.success) {
          window.location.href = '/diagnostico?token=' + encodeURIComponent(token) + '&page=2';
        } else {
          status.textContent = r.error || 'Erro ao guardar.';
          status.className = 'status err';
        }
      } catch (err) {
        status.textContent = 'Erro ao guardar. Tenta de novo.';
        status.className = 'status err';
      }
    });
  `;

  return htmlShell('Análise da Pele — Página 1', content, script);
}

// ─── Página 2: Estilo & Hábitos de Vida + A Tua Pele ────────────────────────
function renderPage2(lead: DiagnosticLead, data: Record<string, string[]>): string {
  const content = `
    ${progressDots(2, 3)}
    <h1>Análise da tua Pele</h1>

    <form id="form-diag" class="grid" novalidate>
      <input type="hidden" name="token" value="${lead.token}" />
      <input type="hidden" name="_page" value="2" />

      <h2>Estilo & Hábitos de Vida</h2>

      <fieldset>
        <legend class="lbl">Qual o teu nível de stress diário? <span class="req">*</span></legend>
        <div class="grid" style="margin-top:8px">
          ${radioOpts('stress_nivel', ['1 - Muito Baixo', '2', '3', '4', '5 - Muito Elevado'], data.stress_nivel?.[0])}
        </div>
      </fieldset>

      <fieldset>
        <legend class="lbl">Como descreves o teu sono? <span class="req">*</span></legend>
        <div class="grid" style="margin-top:8px">
          ${checkboxOpts('sono_tipo', [
            'Sono Reparador (Dormes entre 7 a 9 horas seguidas e acordas descansada)',
            'Poucas Horas de sono (Dormes menos de 6 horas por noite com frequência)',
            'Sono Fragmentado/Agitado (Acordas várias vezes durante a noite ou demoras muito a adormecer)',
            'Dormes em horários Irregulares (Acordas/deitas-te frequentemente em horas diferentes)',
          ], data.sono_tipo)}
        </div>
      </fieldset>

      ${textareaField('diag-sono-lado', 'sono_lado', 'Dormes habitualmente de que lado?', data.sono_lado?.[0])}
      ${textareaField('diag-sono-fronha', 'sono_fronha', 'Com que frequência trocas a fronha da almofada?', data.sono_fronha?.[0])}

      <fieldset>
        <legend class="lbl">Como é a tua ingestão diária de água? <span class="req">*</span></legend>
        <div class="grid" style="margin-top:8px">
          ${radioOpts('agua_ingestao', ['Baixa (<1L)', 'Média (aproximadamente 1,5L)', 'Alta (2L ou mais)'], data.agua_ingestao?.[0])}
        </div>
      </fieldset>

      <fieldset>
        <legend class="lbl">Como classificas a tua alimentação habitual? <span class="req">*</span></legend>
        <div class="grid" style="margin-top:8px">
          ${checkboxOpts('alimentacao', [
            'Equilibrada',
            'Rica em processados',
            'Rica em açúcares',
            'Alto consumo de lacticínios',
            'Dieta com pouca gordura',
            'Vegetariana/vegan',
            'Consumo muito café (a partir de 4 cafés por dia)',
            'Salto refeições com frequência',
          ], data.alimentacao)}
        </div>
      </fieldset>

      <fieldset>
        <legend class="lbl">Qual o teu nível de exposição solar diário? <span class="req">*</span></legend>
        <div class="grid" style="margin-top:8px">
          ${radioOpts('exposicao_solar', ['Baixa (Trabalho no interior)', 'Moderada (Deslocações diárias)', 'Alta (Trabalho/desporto no exterior)'], data.exposicao_solar?.[0])}
        </div>
      </fieldset>

      <fieldset>
        <legend class="lbl">Alguma destas situações faz parte da tua rotina? <span class="req">*</span></legend>
        <div class="grid" style="margin-top:8px">
          ${checkboxOpts('ambiente_fatores', [
            'Estou frequentemente exposta a ar Condicionado/Aquecimento',
            'Sou fumadora (qualquer tipo)',
            'Estou frequentemente exposta a fumo/poluição',
            'Pratico desporto frequentemente',
            'Pratico natação',
            'Uso máscara no trabalho',
            'Estou frequentemente exposta a luz azul (ecrãs)',
          ], data.ambiente_fatores)}
        </div>
      </fieldset>

      <h2>A Tua Pele</h2>

      <fieldset>
        <legend class="lbl">Ao acordar, qual é a primeira sensação na pele do rosto? <span class="req">*</span></legend>
        <div class="grid" style="margin-top:8px">
          ${radioOpts('pele_acordar', [
            'Oleosa no rosto todo (brilho visível e sensação de filme escorregadio)',
            'Oleosa apenas na Zona T (testa, nariz e queixo) e normal nas bochechas',
            'Confortável e equilibrada',
            'Muito seca, a repuxar ou a escamar',
            'Vermelha, quente ou irritada',
          ], data.pele_acordar?.[0])}
        </div>
      </fieldset>

      <fieldset>
        <legend class="lbl">Duas horas após lavares o rosto (sem aplicar qualquer creme), como está a tua pele? <span class="req">*</span></legend>
        <div class="grid" style="margin-top:8px">
          ${radioOpts('pele_2h', [
            'Começa a produzir óleo rapidamente',
            'Fica baça, repuxa e tens vontade imediata de pôr hidratante',
            'Mantém-se confortável sem necessidade de aplicar nada',
            'Começa a arder ou a ficar com manchas vermelhas',
          ], data.pele_2h?.[0])}
        </div>
      </fieldset>

      <fieldset>
        <legend class="lbl">À tarde, qual é a tua maior frustração visual no espelho? <span class="req">*</span></legend>
        <div class="grid" style="margin-top:8px">
          ${radioOpts('pele_tarde', [
            'Brilho excessivo que parece "gordura" (onde a maquilhagem derrete ou desaparece)',
            'Pele a escamar, com zonas secas (onde a maquilhagem craquela)',
            'Aspeto cansado, baço e sem luminosidade',
            'Vermelhidão intensa nas maçãs do rosto ou à volta do nariz',
            'Não tenho nenhuma destas preocupações',
          ], data.pele_tarde?.[0])}
        </div>
      </fieldset>

      <fieldset>
        <legend class="lbl">Tens preocupações com a textura da tua pele? <span class="req">*</span></legend>
        <div class="grid" style="margin-top:8px">
          ${checkboxOpts('pele_textura', [
            'Grãozinhos pretos no nariz/queixo (filamentos sebáceos)',
            'Textura irregular/rugosa ao toque, como se tivesse "areia" sob a pele',
            'Zonas ásperas e a escamar',
            'Bolinhas brancas muito duras ao toque, que não doem, não inflamam e parecem estar "presas" sob a pele há meses',
            'Não tenho nenhuma destas preocupações',
          ], data.pele_textura)}
        </div>
      </fieldset>

      <fieldset>
        <legend class="lbl">Tens preocupações com cor na tua pele? <span class="req">*</span></legend>
        <div class="grid" style="margin-top:8px">
          ${checkboxOpts('pele_cor', [
            'Tenho o tom irregular, manchas escuras ou acastanhadas',
            'Tenho vermelhidão constante (rubor nas bochechas/nariz)',
            'Sinto que as manchas parecem escurecer com a exposição ao calor',
            'Noto que as marcas deixadas por borbulhas antigas demoram meses a desaparecer',
            'Não tenho nenhuma destas preocupações',
          ], data.pele_cor)}
        </div>
      </fieldset>

      <fieldset>
        <legend class="lbl">Como reage a tua pele ao toque e aos produtos básicos? <span class="req">*</span></legend>
        <div class="grid" style="margin-top:8px">
          ${checkboxOpts('pele_toque', [
            'Sinto sensação de picada, ardor ou queimadura ao aplicar produtos simples',
            'Sinto a pele "fina", repuxada e brilhante (aspeto plastificado), mas a escamar em certas zonas',
            'Sinto que a pele absorve os cremes instantaneamente, mas minutos depois volta a ficar seca',
            'Não tenho nenhuma destas preocupações',
          ], data.pele_toque)}
        </div>
      </fieldset>

      <fieldset>
        <legend class="lbl">Como reage a tua pele ao ambiente e em zonas específicas do rosto? <span class="req">*</span></legend>
        <div class="grid" style="margin-top:8px">
          ${checkboxOpts('pele_ambiente', [
            'Sinto a pele a ficar vermelha, quente ou reativa perante fatores externos',
            'Tenho tendência a ficar com marcas vermelhas ao tocar na pele, urticária ou comichão',
            'Noto zonas de escamação ou pequenas vermelhidões concentradas em áreas específicas',
            'Não tenho nenhuma destas preocupações',
          ], data.pele_ambiente)}
        </div>
      </fieldset>

      <fieldset>
        <legend class="lbl">Como se comportam as tuas borbulhas ou imperfeições? <span class="req">*</span></legend>
        <div class="grid" style="margin-top:8px">
          ${checkboxOpts('pele_borbulhas', [
            'Noto lesões/borbulhas profundas, dolorosas e internas',
            'Noto que as borbulhas ou imperfeições tendem a aparecer quase sempre nas mesmas zonas',
            'Noto um agravamento claro na semana anterior à menstruação ou após consumir certos alimentos',
            'Noto pontos negros ou brancos, mas sem inflamação nem dor',
            'Noto que surgem borbulhas após usar certos produtos cosméticos',
            'Noto que as borbulhas surgem em zonas de fricção diária',
            'Tenho o hábito compulsivo de mexer, espremer ou raspar as lesões',
            'Noto uma textura de "grãozinhos" ou borbulhas pequeninas e uniformes',
            'Não tenho nenhuma destas preocupações',
          ], data.pele_borbulhas)}
        </div>
      </fieldset>

      <fieldset>
        <legend class="lbl">Como notas as tuas linhas e a firmeza do rosto? <span class="req">*</span></legend>
        <div class="grid" style="margin-top:8px">
          ${checkboxOpts('pele_firmeza', [
            'Noto que as linhas de expressão só aparecem quando sorrio ou gesticulo',
            'Noto linhas ou rugas visíveis mesmo com o rosto totalmente em repouso',
            'Sinto uma perda de firmeza ou elasticidade no contorno do rosto, pescoço ou colo',
          ], data.pele_firmeza)}
        </div>
      </fieldset>

      <fieldset>
        <legend class="lbl">Como caracterizas a zona do teu contorno de olhos? <span class="req">*</span></legend>
        <div class="grid" style="margin-top:8px">
          ${checkboxOpts('pele_contorno_olhos', [
            'Olheiras arroxeadas/azuladas',
            'Olheiras castanhas/escuras',
            'Cavidade funda',
            'Inchaço / Bolsas matinais',
            'Linhlas finas de desidratação / Pés de galinha',
          ], data.pele_contorno_olhos)}
        </div>
      </fieldset>

      <div class="btn-row">
        <button type="button" class="btn btn-outline" onclick="history.back()">← Anterior</button>
        <button type="submit" class="btn">Próxima →</button>
      </div>
      <p id="diag-status" class="status" role="status" aria-live="polite"></p>
    </form>`;

  const script = `
    const form = document.getElementById('form-diag');
    const status = document.getElementById('diag-status');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      let valid = true;
      form.querySelectorAll('[required]').forEach((el) => {
        if (el.type === 'checkbox' || el.type === 'radio') {
          const group = form.querySelectorAll('input[name="' + el.name + '"]:checked');
          if (group.length === 0) { valid = false; }
        } else if (!(el.value || '').trim()) {
          valid = false;
          el.style.borderColor = '#b3261e';
        }
      });
      if (!valid) { status.textContent = 'Faltam alguns campos obrigatórios.'; status.className = 'status err'; return; }
      status.textContent = 'A guardar...';
      const fd = new FormData(form);
      const data = {};
      fd.forEach((v, k) => {
        if (k === 'token' || k === '_page') return;
        if (!data[k]) data[k] = [];
        data[k].push(v);
      });
      const token = fd.get('token');
      try {
        const res = await fetch('/api/diagnostico/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token, page: 2, data }),
        });
        const r = await res.json();
        if (r.success) {
          window.location.href = '/diagnostico?token=' + encodeURIComponent(token) + '&page=3';
        } else {
          status.textContent = r.error || 'Erro ao guardar.';
          status.className = 'status err';
        }
      } catch (err) {
        status.textContent = 'Erro ao guardar. Tenta de novo.';
        status.className = 'status err';
      }
    });
  `;

  return htmlShell('Análise da Pele — Página 2', content, script);
}

// ─── Página 3: Rotina Atual + Preferências + Fotos ──────────────────────────
function renderPage3(lead: DiagnosticLead, data: Record<string, string[]>): string {
  const content = `
    ${progressDots(3, 3)}
    <h1>Análise da tua Pele</h1>

    <form id="form-diag" class="grid" novalidate>
      <input type="hidden" name="token" value="${lead.token}" />
      <input type="hidden" name="_page" value="3" />

      <h2>A Tua Rotina Atual</h2>

      ${textareaField('diag-rotina-manha', 'rotina_manha', 'Descreve, o mais detalhadamente possível, a tua rotina da manhã. Especifica os produtos que usas, a ordem com que os aplicas e com que frequência os usas:', data.rotina_manha?.[0], 'Produtos, ordem de aplicação, frequência...')}
      ${textareaField('diag-rotina-noite', 'rotina_noite', 'Descreve, o mais detalhadamente possível, a tua rotina da noite. Especifica os produtos que usas, a ordem com que os aplicas e com que frequência os usas:', data.rotina_noite?.[0], 'Produtos, ordem de aplicação, frequência...')}

      <fieldset>
        <legend class="lbl">Quantos dias por semana cumpres a tua rotina completa de manhã e à noite sem falhar? <span class="req">*</span></legend>
        <div class="grid" style="margin-top:8px">
          ${radioOpts('rotina_consistencia', [
            '7 dias por semana (100% consistente)',
            '4 a 6 dias por semana (falho por vezes à noite)',
            '1 a 3 dias por semana (apenas quando me lembro ou tenho tempo)',
          ], data.rotina_consistencia?.[0])}
        </div>
      </fieldset>

      ${textareaField('diag-esfoliacao', 'rotina_esfoliacao', 'Fazes esfoliação físicas (com grãozinhos/fricção)? Com que frequência?', data.rotina_esfoliacao?.[0])}
      ${textareaField('diag-mascaras', 'rotina_mascaras', 'Usas máscaras? Quais? Com que frequência?', data.rotina_mascaras?.[0])}
      ${textareaField('diag-dispositivos', 'rotina_dispositivos', 'Usas dispositivos de limpeza (ex: escovas de silicone, Foreo)? Com que frequência?', data.rotina_dispositivos?.[0])}
      ${textareaField('diag-favorito', 'rotina_favorito', 'Existe algum produto do qual não prescindes por nada e que sentes que transforma a tua pele?', data.rotina_favorito?.[0])}
      ${textareaField('diag-odeia', 'rotina_odeia', 'Existe algum produto que compraste e não gostaste? Por que motivo deixaste de o usar?', data.rotina_odeia?.[0])}

      <fieldset>
        <legend class="lbl">Com que frequência usas maquilhagem? <span class="req">*</span></legend>
        <div class="grid" style="margin-top:8px">
          ${radioOpts('rotina_maquilhagem_freq', [
            'Diariamente (Alta cobertura/longa duração)',
            'Diariamente (Apenas algo leve)',
            '2 a 3 vezes por semana',
            'Apenas em ocasiões especiais ou raramente',
          ], data.rotina_maquilhagem_freq?.[0])}
        </div>
      </fieldset>

      <fieldset>
        <legend class="lbl">Como costumas retirar a maquilhagem no final do dia? <span class="req">*</span></legend>
        <div class="grid" style="margin-top:8px">
          ${radioOpts('rotina_maquilhagem_retirar', [
            'Óleo ou bálsamo desmaquilhante',
            'Água micelar',
            'Apenas com o gel de limpeza',
            'Toalhitas desmaquilhantes',
          ], data.rotina_maquilhagem_retirar?.[0])}
        </div>
      </fieldset>

      <fieldset>
        <legend class="lbl">Como lavas e secas o rosto? <span class="req">*</span></legend>
        <div class="grid" style="margin-top:8px">
          ${checkboxOpts('rotina_lavar_rosto', [
            'Lavo com água quente',
            'Lavo com água tépida',
            'Seco com a toalha habitual (das mãos ou do corpo)',
            'Seco com uma toalha de utilização única/descartável',
          ], data.rotina_lavar_rosto)}
        </div>
      </fieldset>

      ${textareaField('diag-pinceis', 'rotina_pinceis', 'Com que frequência lavas os pincéis e esponjas de maquilhagem?', data.rotina_pinceis?.[0])}
      ${textareaField('diag-telemovel', 'rotina_telemovel', 'Com que frequência limpas o ecrã do telemóvel?', data.rotina_telemovel?.[0])}
      ${textareaField('diag-mexer-rosto', 'rotina_mexer_rosto', 'Tens o hábito de mexer frequentemente no rosto? (ter as mãos no rosto, pousar a cabeça na mão,…)', data.rotina_mexer_rosto?.[0])}
      ${textareaField('diag-espremer', 'rotina_espremer', 'Tens o hábito de espremer borbulhas?', data.rotina_espremer?.[0])}
      ${textareaField('diag-depilacao', 'rotina_depilacao', 'Fazes depilação no rosto? Com que frequência? Qual o método? Como reage a pele?', data.rotina_depilacao?.[0])}

      <h2>As tuas preferências e expectativas</h2>

      <fieldset>
        <legend class="lbl">Quanto tempo pretendes dedicar à tua rotina diária? <span class="req">*</span></legend>
        <div class="grid" style="margin-top:8px">
          ${radioOpts('preferencias_tempo', [
            'Minimalista / Express (2 min)',
            'Moderado (5 min)',
            'Ritual Completo (10+ min)',
          ], data.preferencias_tempo?.[0])}
        </div>
      </fieldset>

      <fieldset>
        <legend class="lbl">Que tipo de texturas DETESTAS sentir na pele? <span class="req">*</span></legend>
        <div class="grid" style="margin-top:8px">
          ${checkboxOpts('preferencias_texturas', [
            'Oleosas / Densas',
            'Pegajosas / Efeito "cola"',
            'Demasiado aquosas',
            'Perfumes/Cheiros fortes',
            'Nenhum dos anteriores',
          ], data.preferencias_texturas)}
        </div>
      </fieldset>
      ${textareaField('diag-texturas-outro', 'preferencias_texturas_outro', 'Outro (qual?):', data.preferencias_texturas_outro?.[0])}

      <fieldset>
        <legend class="lbl">Qual é a tua maior dificuldade em manter uma rotina? <span class="req">*</span></legend>
        <div class="grid" style="margin-top:8px">
          ${checkboxOpts('preferencias_dificuldades', [
            'Falta de tempo',
            'Esquecimento/Falta de consistência',
            'Desmotivação por demorar a ver resultados',
            'Não saber a ordem dos produtos',
            'Não saber que produtos devo usar',
            'Não tenho essa dificuldade',
          ], data.preferencias_dificuldades)}
        </div>
      </fieldset>
      ${textareaField('diag-dificuldades-outro', 'preferencias_dificuldades_outro', 'Outro (qual?):', data.preferencias_dificuldades_outro?.[0])}

      <fieldset>
        <legend class="lbl">Orçamento médio pretendido para a nova rotina: <span class="req">*</span></legend>
        <div class="grid" style="margin-top:8px">
          ${radioOpts('preferencias_orcamento', [
            'Acessível',
            'Intermédio',
            'Premium',
          ], data.preferencias_orcamento?.[0])}
        </div>
      </fieldset>

      ${textareaField('diag-prioridade1', 'prioridade_1', 'Se só pudesses resolver UMA coisa na tua pele nos próximos 3 meses, qual seria?', data.prioridade_1?.[0])}
      ${textareaField('diag-prioridade2', 'prioridade_2', 'E qual seria a segunda coisa mais importante?', data.prioridade_2?.[0])}
      ${textareaField('diag-pergunta', 'pergunta_nao_pode_ficar', 'Qual é a pergunta ou dúvida que NÃO PODE FICAR POR RESPONDER na nossa chamada?', data.pergunta_nao_pode_ficar?.[0])}
      ${textareaField('diag-mais', 'mais_alguma_coisa', 'Há mais alguma coisa importante que me queiras dizer?', data.mais_alguma_coisa?.[0])}

      <h2>Avaliação Visual</h2>
      <div>
        <label class="lbl">Upload de Fotos da Pele <span class="req">*</span></label>
        <p class="hint">Por favor, anexa 3 fotos da tua pele sem qualquer maquilhagem, creme ou filtro, tiradas com luz natural de janela (sem luz direta):<br/>1. Frente | 2. Perfil Esquerdo | 3. Perfil Direito</p>
        <div class="file-group">
          <label>Foto 1 — Frente</label>
          <input type="file" name="foto1" accept="image/*" required />
        </div>
        <div class="file-group">
          <label>Foto 2 — Perfil Esquerdo</label>
          <input type="file" name="foto2" accept="image/*" required />
        </div>
        <div class="file-group">
          <label>Foto 3 — Perfil Direito</label>
          <input type="file" name="foto3" accept="image/*" required />
        </div>
      </div>

      <div style="margin-top:16px">
        <label class="lbl"><input type="checkbox" name="consent" required class="accent-burgundy" /> Li e aceito que os meus dados sejam usados para o meu acompanhamento de pele, e que o pedido seja contactado pela Mariana. <span class="req">*</span></label>
      </div>

      <div class="btn-row">
        <button type="button" class="btn btn-outline" onclick="history.back()">← Anterior</button>
        <button type="submit" class="btn">Submeter Diagnóstico</button>
      </div>
      <p id="diag-status" class="status" role="status" aria-live="polite"></p>
    </form>

    <div id="diag-done" class="done" role="status">
      <h2>✓ Diagnóstico enviado</h2>
      <p>Obrigada! Recebi o teu diagnóstico. Entrarei em contacto dentro de 48h.</p>
    </div>`;

  const script = `
    const form = document.getElementById('form-diag');
    const status = document.getElementById('diag-status');
    const done = document.getElementById('diag-done');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (done.dataset.done) return;
      let valid = true;
      form.querySelectorAll('[required]').forEach((el) => {
        if (el.type === 'checkbox' || el.type === 'radio') {
          const group = form.querySelectorAll('input[name="' + el.name + '"]:checked');
          if (group.length === 0) { valid = false; }
        } else if (el.type === 'file') {
          if (!el.files || el.files.length === 0) { valid = false; }
        } else if (!(el.value || '').trim()) {
          valid = false;
          el.style.borderColor = '#b3261e';
        }
      });
      if (!valid) { status.textContent = 'Faltam alguns campos obrigatórios (incluindo fotos).'; status.className = 'status err'; return; }
      status.textContent = 'A enviar diagnóstico...';
      const fd = new FormData(form);
      try {
        const res = await fetch('/api/diagnostico', {
          method: 'POST',
          body: fd,
          headers: { Accept: 'application/json' },
        });
        const data = await res.json();
        if (data.success) {
          done.dataset.done = '1';
          form.style.display = 'none';
          done.style.display = 'block';
          done.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else {
          status.textContent = data.error || 'Algo correu mal. Tenta de novo.';
          status.className = 'status err';
        }
      } catch (err) {
        status.textContent = 'Algo correu mal. Tenta de novo.';
        status.className = 'status err';
      }
    });
  `;

  return htmlShell('Análise da Pele — Página 3', content, script);
}

// ─── Página de sucesso ───────────────────────────────────────────────────────
function renderSuccess(): string {
  const content = `
    <div id="diag-done" style="text-align:center;padding:40px 24px">
      <h2 style="font-size:22px;color:#0a7a4a;margin:0 0 8px">✓ Diagnóstico enviado</h2>
      <p style="color:#7a6a64;font-size:14px;margin:0">Obrigada! Recebi o teu diagnóstico. Entrarei em contacto dentro de 48h.</p>
    </div>`;
  return htmlShell('Diagnóstico Enviado', content);
}

// ─── Erro ────────────────────────────────────────────────────────────────────
export function renderDiagnosticError(reason: 'missing' | 'invalid' | 'expired'): Response {
  const messages = {
    missing: 'Falta o token de acesso neste link.',
    invalid: 'Este link de diagnóstico não é válido.',
    expired: 'Este link de diagnóstico expirou (2 meses). Pede um novo no formulário da Skin Call.',
  } as const;
  const html = `<!doctype html>
<html lang="pt">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><meta name="robots" content="noindex"/>
<title>Diagnóstico</title>
<style>body{font-family:-apple-system,sans-serif;background:#f6f0ea;color:#3b2a2a;display:flex;min-height:100vh;align-items:center;justify-content:center;margin:0;padding:24px}
.card{background:#fff;border:1px solid rgba(59,42,42,.1);border-radius:12px;padding:32px;max-width:420px;text-align:center}
h1{font-size:22px;color:#8a2831;margin:0 0 12px}p{color:#7a6a64;font-size:14px;line-height:1.6;margin:0}
a{display:inline-block;margin-top:20px;background:#8a2831;color:#fbf5ef;text-decoration:none;padding:12px 24px;border-radius:999px;font-size:14px}</style>
</head>
<body><main class="card"><h1>Diagnóstico indisponível</h1><p>${messages[reason]}</p>
<a href="/servicos/skin-call">Voltar à Skin Call</a></main></body></html>`;
  return new Response(html, {
    status: reason === 'missing' ? 400 : 410,
    headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' },
  });
}

// ─── Renderizador principal ──────────────────────────────────────────────────
export function renderDiagnosticPage(lead: DiagnosticLead, page: number = 1, data: Record<string, string[]> = {}): Response {
  let html: string;
  switch (page) {
    case 2:
      html = renderPage2(lead, data);
      break;
    case 3:
      html = renderPage3(lead, data);
      break;
    case 4:
      html = renderSuccess();
      break;
    default:
      html = renderPage1(lead);
  }
  return new Response(html, {
    headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' },
  });
}
