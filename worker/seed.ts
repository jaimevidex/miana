// Seed script — cria utilizadores admin na D1.
// Uso: npx tsx worker/seed.ts <password1> [password2]
//
// Exemplo:
//   npx tsx worker/seed.ts minhapassword1 minhapassword2
//
// Cria 2 users:
//   1. hello@marianapita.pt (password1)
//   2. mpitamakeup@gmail.com (password2 ou password1 se omitido)

import { hashPassword } from './auth/password';

const USERS = [
  { email: 'hello@marianapita.pt', name: 'Mariana Pita' },
  { email: 'mpitamakeup@gmail.com', name: 'Admin' },
];

async function main() {
  const password1 = process.argv[2];
  const password2 = process.argv[3] || password1;

  if (!password1) {
    console.error('Uso: npx tsx worker/seed.ts <password1> [password2]');
    process.exit(1);
  }

  console.log('A gerar hashes de password...\n');

  const inserts: string[] = [];
  for (let i = 0; i < USERS.length; i++) {
    const user = USERS[i];
    const password = i === 0 ? password1 : password2;
    const hash = await hashPassword(password);
    const id = crypto.randomUUID();
    const now = Date.now();

    inserts.push(
      `INSERT OR IGNORE INTO users (id, email, password_hash, name, created_at) VALUES ('${id}', '${user.email}', '${hash}', '${user.name}', ${now});`
    );

    console.log(`User: ${user.email}`);
    console.log(`  Nome: ${user.name}`);
    console.log(`  ID: ${id}`);
    console.log(`  Hash: ${hash.substring(0, 20)}...`);
    console.log('');
  }

  // Gerar ficheiro SQL
  const sql = `-- Seed: utilizadores admin\n-- Gerado automaticamente por worker/seed.ts\n\n${inserts.join('\n')}\n`;

  const fs = await import('fs');
  fs.writeFileSync('seed.sql', sql);
  console.log('Ficheiro seed.sql gerado!');
  console.log('\nPara aplicar:');
  console.log('  npx wrangler d1 execute miana-db --remote --file=seed.sql');
}

main().catch((err) => {
  console.error('Erro:', err);
  process.exit(1);
});
