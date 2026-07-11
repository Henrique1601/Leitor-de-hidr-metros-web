const MSG_START = /^(\d{2})\/(\d{2})\/(\d{4}) \d{1,2}:\d{2} da (manha|tarde|noite) - /;
const ATTACH_RE = /\u200e?(IMG-(\d{8})-WA\d+\.(jpg|jpeg|png))\s\(arquivo anexado\)/i;

const chat = `10/07/2025 9:30 da manha - Joao: IMG-20250710-WA0001.jpg (arquivo anexado)
Apartamento 101, 102
10/07/2025 9:35 da manha - Joao: IMG-20250710-WA0002.jpg (arquivo anexado)
103 104`;

const lines = chat.split('\n');
console.log('Total lines:', lines.length);
lines.forEach((line, i) => {
  const hasAttach = ATTACH_RE.test(line);
  const hasMsgStart = MSG_START.test(line);
  const codes = [...line].map(c => c.charCodeAt(0)).slice(0, 20);
  console.log(`Line ${i}: attach=${hasAttach} msgStart=${hasMsgStart} chars=${codes.join(',')}`);
  console.log(`  text: "${line}"`);
});
