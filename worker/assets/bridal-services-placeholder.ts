// PDF placeholder dos serviços de noiva (substituir pelo ficheiro real).

function pdfBytes(text: string): Uint8Array {
  const stream = `BT /F1 16 Tf 72 720 Td (${text}) Tj ET`;
  const objects = [
    '1 0 obj<< /Type /Catalog /Pages 2 0 R >>endobj',
    '2 0 obj<< /Type /Pages /Kids [3 0 R] /Count 1 >>endobj',
    `3 0 obj<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources<< /Font<< /F1 5 0 R >> >> >>endobj`,
    `4 0 obj<< /Length ${stream.length} >>stream\n${stream}\nendstream endobj`,
    '5 0 obj<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>endobj',
  ];
  let body = '%PDF-1.1\n';
  const offsets = [0];
  for (const obj of objects) {
    offsets.push(body.length);
    body += obj + '\n';
  }
  const xrefStart = body.length;
  let xref = `xref\n0 6\n0000000000 65535 f \n`;
  for (let i = 1; i <= 5; i++) {
    xref += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }
  body += xref;
  body += `trailer<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;
  return new TextEncoder().encode(body);
}

export const BRIDAL_SERVICES_PLACEHOLDER_FILENAME = 'servicos-de-noiva.pdf';
export const BRIDAL_SERVICES_PLACEHOLDER_TYPE = 'application/pdf';

export function bridalServicesPlaceholderPdf(): Uint8Array {
  return pdfBytes('Servicos de Noiva - PLACEHOLDER - substituir pelo PDF real');
}
