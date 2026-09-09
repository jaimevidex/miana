// One-shot: normaliza HTML dos templates de email na D1 local.

import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { normalizeEmailBodyHtml } from '../worker/email-sanitize.ts';

function sqlStr(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

const dump = execFileSync(
  'npx',
  ['wrangler', 'd1', 'execute', 'miana-db', '--local', '--json', '--command', "SELECT key, value FROM settings WHERE key LIKE 'email_%_body%'"],
  { encoding: 'utf8' },
);
const jsonStart = dump.indexOf('[');
if (jsonStart < 0) {
  console.error('Não foi possível ler a D1 local.');
  process.exit(1);
}

const parsed = JSON.parse(dump.slice(jsonStart)) as Array<{ results?: { key: string; value: string }[] }>;
const rows = parsed[0]?.results || [];
if (!rows.length) {
  console.log('Não há email_*_body na D1 local.');
  process.exit(0);
}

const now = Date.now();
const statements = ['-- Gerado por scripts/normalize-local-email-bodies.ts'];
let changed = 0;
for (const row of rows) {
  const next = normalizeEmailBodyHtml(row.value || '');
  if (next === (row.value || '')) continue;
  changed += 1;
  statements.push(
    `UPDATE settings SET value = ${sqlStr(next)}, updated_at = ${now} WHERE key = ${sqlStr(row.key)};`,
  );
}

if (!changed) {
  console.log(`Nada a actualizar (${rows.length} bodies já normalizados).`);
  process.exit(0);
}

const sqlPath = join(mkdtempSync(join(tmpdir(), 'miana-email-')), 'normalize.sql');
writeFileSync(sqlPath, `${statements.join('\n')}\n`);
execFileSync('npx', ['wrangler', 'd1', 'execute', 'miana-db', '--local', '--file', sqlPath], { stdio: 'inherit' });
console.log(`Actualizados ${changed} de ${rows.length} templates de email na D1 local.`);
