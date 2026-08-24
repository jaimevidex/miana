// Página privada `/diagnostico` — server-rendered a partir do token (dados vêm do KV, não do browser).
import type { Lead } from './lib';
import { htmlEscape } from './lib';

const PLANS = [
  { v: 'One Time Call (Plano 3M)', t: 'One Time Call - Plano 3M' },
  { v: 'Duo Call (Plano 6M)', t: 'Duo Call - Plano 6M' },
  { v: 'Triple Call (Plano 9M)', t: 'Triple Call - Plano 9M' },
  { v: 'Full Year Call (Plano 12M)', t: 'Full Year Call - Plano 12M' },
  { v: 'Ainda não sei', t: 'Ainda não sei' },
];

const ROUTINE_Q = [
  {
    name: 'rotina',
    label: 'Descreve a tua rotina de pele atual',
    hint: 'O que usas de manhã e à noite, e com que frequência.',
    placeholder: 'Ex.: de manhã lavo com gel, hidratante e protetor solar; à noite remover maquilhagem e creme noturno.',
  },
  {
    name: 'rotina_frequencia',
    label: 'Com que regularidade segues essa rotina?',
    options: [
      'Quase todos os dias',
      '2-3 vezes por semana',
      'Só quando me lembro',
      'Ainda não tenho rotina',
    ],
  },
  {
    name: 'preocupacoes',
    label: 'Quais as principais preocupações de pele?',
    hint: 'Podes escolher mais do que uma opção.',
    options: [
      'Acne / borbulhas',
      'Pigmentação / manchas',
      'Sinais de envelhecimento',
      'Vermelhidão / sensibilidade',
      'Ressecamento / desidratação',
      'Opacidade / brilho',
      'Poros dilatados',
      'Outra',
    ],
    multiple: true,
  },
  {
    name: 'alergias',
    label: 'Tens alergias ou ingredientes que evitas?',
    placeholder: 'Deixa em branco se não se aplicar.',
    optional: true,
  },
];

function fieldCls(multiple = false): string {
  return `mt-1 w-full border border-darkbrown/20 rounded-md px-4 py-3 bg-white focus:border-burgundy outline-none`;
}

function taCls(): string {
  return `mt-1 w-full border border-darkbrown/20 rounded-md px-4 py-3 bg-white focus:border-burgundy outline-none resize-y min-h-[110px] text-sm leading-relaxed`;
}

function planRadios(selected: string): string {
  return PLANS.map(
    (p) => `
      <label class="inline-flex items-start gap-3 text-sm bg-white border border-darkbrown/10 rounded-sm px-4 py-3">
        <input type="radio" name="plano" value="${htmlEscape(p.v)}" ${p.v === selected ? 'checked' : ''} required class="accent-burgundy mt-0.5" />
        <span>${htmlEscape(p.t)}</span>
      </label>`
  ).join('\n');
}

function routineFieldsets(lead: Lead): string {
  const html: string[] = [];
  for (const q of ROUTINE_Q) {
    const required = q.optional ? '' : 'required';
    if (q.options) {
      const opts = q.options.map((o) => {
        const type = q.multiple ? 'checkbox' : 'radio';
        return `
          <label class="inline-flex items-start gap-3 text-sm bg-white border border-darkbrown/10 rounded-sm px-4 py-3">
            <input type="${type}" name="${q.name}" value="${htmlEscape(o)}" ${required} class="accent-burgundy mt-0.5" />
            <span>${htmlEscape(o)}</span>
          </label>`;
      }).join('\n');
      const star = q.optional ? '' : ' <span class="text-burgundy">*</span>';
      html.push(`
        <fieldset>
          <legend class="block text-sm font-medium text-darkbrown">${htmlEscape(q.label)}${star}</legend>
          <div class="grid gap-2 mt-3">${opts}</div>
        </fieldset>`);
    } else {
      const star = q.optional ? '' : ' <span class="text-burgundy">*</span>';
      html.push(`
        <div class="ta-wrap">
          <label class="block text-sm font-semibold text-darkbrown" for="${q.name}">${htmlEscape(q.label)}${star}</label>
          <textarea id="${q.name}" name="${q.name}" rows="5" ${required} class="${taCls()}"
            placeholder="${htmlEscape(q.hint || q.placeholder || '')}"></textarea>
        </div>`);
    }
  }
  return html.join('\n');
}

export function renderDiagnosticPage(lead: Lead): Response {
  const nome = htmlEscape(lead.nome);
  const email = htmlEscape(lead.email);
  const telefone = htmlEscape(lead.telefone);
  const planOptions = planRadios(lead.plano);
  const routineHtml = routineFieldsets(lead);

  const html = `<!doctype html>
<html lang="pt">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="robots" content="noindex, nofollow" />
  <title>Diagnóstico de pele — Skin Call</title>
  <style>
    body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;background:#f6f0ea;color:#3b2a2a;margin:0;padding:24px 16px;line-height:1.6}
    .wrap{max-width:640px;margin:0 auto}
    .card{background:#fff;border:1px solid rgba(59,42,42,.08);border-radius:16px;padding:32px 28px;box-shadow:0 12px 40px rgba(59,42,42,.06)}
    h1{font-size:26px;margin:0 0 8px;color:#8a2831}
    p.sub{color:#7a6a64;font-size:14px;margin:0 0 24px}
    .lbl{display:block;font-size:14px;font-weight:600;color:#3b2a2a;margin-bottom:2px}
    .in,textarea{border:1.5px solid #e5ded7;border-radius:12px;padding:14px 16px;font-size:15px;box-sizing:border-box;width:100%;background:#fff;transition:border-color .15s,box-shadow .15s;color:#3b2a2a}
    .in:focus,textarea:focus{border-color:#8a2831;box-shadow:0 0 0 4px rgba(138,40,49,.10);outline:none}
    .in::placeholder,textarea::placeholder{color:#b4a8a1;font-family:inherit;font-weight:400;font-style:normal;opacity:1}
    .ta-wrap{margin-top:2px}
    .ta-hint{color:#8a7a74;font-size:12.5px;margin:7px 0 0}
    textarea{resize:vertical;min-height:130px;line-height:1.7}
    .opt{display:inline-flex;align-items:flex-start;gap:12px;font-size:14px;background:#fff;border:1.5px solid #e5ded7;border-radius:12px;padding:13px 16px;margin-bottom:8px;cursor:pointer;width:100%;box-sizing:border-box;transition:border-color .15s,background .15s}
    .opt:hover{border-color:#8a2831;background:#fbf6f2}
    .opt input{margin-top:3px;accent-color:#8a2831}
    .grid{display:grid;gap:20px}
    .req{color:#8a2831}
    .btn{display:inline-block;background:#8a2831;color:#fbf5ef;padding:15px 36px;font-size:15px;font-weight:600;border:0;border-radius:999px;cursor:pointer;transition:background .15s}
    .btn:hover{background:#6f2027}
    .status{margin-top:12px;font-size:13px}
    .status.ok{color:#0a7a4a;font-weight:600}
    .status.err{color:#b3261e}
    .note{font-size:12px;color:#8a7a74;margin-top:16px}
    fieldset{border:0;padding:0;margin:0}
    fieldset .lbl{margin-bottom:8px}
    .done{display:none;text-align:center;padding:40px 24px}
    .done h2{font-size:22px;color:#0a7a4a;margin:0 0 8px}
    .done p{color:#7a6a64;font-size:14px;margin:0}
  </style>
</head>
<body>
  <main class="wrap card">
    <h1>Diagnóstico de pele</h1>
    <p class="sub">Olá ${nome}! Preenche este diagnóstico para eu perceber o plano mais indicado para ti.</p>

    <form id="form-diagnostico" action="/api/diagnostico" method="POST" class="grid" novalidate>
      <input type="hidden" name="token" value="${lead.token}" />

      <div>
        <label class="lbl" for="diag-nome">Nome completo <span class="req">*</span></label>
        <input id="diag-nome" name="nome" type="text" required value="${nome}" class="in" />
      </div>
      <div>
        <label class="lbl" for="diag-telefone">Contacto telefónico <span class="req">*</span></label>
        <input id="diag-telefone" name="telefone" type="tel" required value="${telefone}" class="in" />
      </div>
      <div>
        <label class="lbl" for="diag-email">E-mail <span class="req">*</span></label>
        <input id="diag-email" name="email" type="email" required value="${email}" class="in" />
      </div>

      <fieldset>
        <legend class="lbl">Plano <span class="req">*</span></legend>
        <div class="grid" style="margin-top:8px">${planOptions}</div>
      </fieldset>

      ${routineHtml}

      <div>
        <label class="lbl"><input type="checkbox" name="consent" required class="accent-burgundy" /> Li e aceito que os meus dados sejam usados para o meu acompanhamento de pele, e que o pedido seja contactado pela Mariana. <span class="req">*</span></label>
      </div>

<div>
        <button type="submit" class="btn">Submeter diagnóstico</button>
        <p id="diag-status" class="status" role="status" aria-live="polite"></p>
      </div>
    </form>

    <div id="diag-done" class="done" role="status">
      <h2>✓ Diagnóstico enviado</h2>
      <p>Obrigada! Recebi o teu diagnóstico. Entrarei em contacto dentro de 48h.</p>
    </div>
  </main>

  <script>
    const form = document.getElementById('form-diagnostico');
    const status = document.getElementById('diag-status');
    const done = document.getElementById('diag-done');
    function markRequired() {
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
      form.querySelectorAll('fieldset').forEach((fs) => {
        const reqs = fs.querySelectorAll('[required]');
        let ok = true;
        reqs.forEach((r) => { if (r.type==='checkbox'||r.type==='radio'){ if(fs.querySelectorAll('input[name="'+r.name+'"]:checked').length===0) ok=false; } else if(!(r.value||'').trim()) ok=false; });
        const legend = fs.querySelector('.lbl');
        legend && (legend.style.color = ok ? '' : '#b3261e');
      });
      return valid;
    }
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (done.dataset.done) return;
      if (!markRequired()) { status.textContent = 'Faltam alguns campos obrigatórios.'; return; }
      status.textContent = 'A enviar...';
      const res = await fetch(form.action, { method: 'POST', body: new FormData(form), headers: { Accept: 'application/json' } });
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
    });
  </script>
</body>
</html>`;

  return new Response(html, { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } });
}

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