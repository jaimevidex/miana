import { statusAfterSuccessfulOutbound } from '../worker/lead-status.ts';

function assertEqual(actual: string, expected: string, message: string): void {
  if (actual !== expected) {
    console.error(`FAIL ${message}: expected ${expected}, received ${actual}`);
    process.exitCode = 1;
    return;
  }
  console.log(`ok ${message}`);
}

assertEqual(statusAfterSuccessfulOutbound('novo'), 'pendente', 'first outbound marks a new lead pending');
assertEqual(statusAfterSuccessfulOutbound('pendente'), 'pendente', 'pending lead remains pending');
assertEqual(statusAfterSuccessfulOutbound('aceite'), 'aceite', 'accepted lead remains accepted');
assertEqual(statusAfterSuccessfulOutbound('eliminado'), 'eliminado', 'deleted lead remains deleted');
assertEqual(statusAfterSuccessfulOutbound('legado'), 'legado', 'unknown status remains unchanged');
