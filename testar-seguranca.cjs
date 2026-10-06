// testar-seguranca.cjs
const reqGlobal = new Map();

function detectar(rota, ip, agora) {
  const umMinuto = 60000;
  const hist = (reqGlobal.get(rota) ?? []).filter(r => agora - r.tempo < umMinuto);
  hist.push({ tempo: agora, ip });
  reqGlobal.set(rota, hist);

  const ips = new Set(hist.map(r => r.ip));
  if (ips.size > 20) return `⚠️ ATAQUE_IPS (${ips.size} IPs únicos)`;
  if (hist.length > 100) return `⚠️ ATAQUE_VOLUME (${hist.length} requisições)`;
  return "✅ NORMAL";
}

const agora = Date.now();

console.log("\n--- TESTE 1: Requisições normais ---");
console.log(detectar("/api/login", "192.168.1.1", agora));

console.log("\n--- TESTE 2: Ataque de Força Bruta (105 requisições do mesmo IP) ---");
for (let i = 0; i < 105; i++) {
  detectar("/api/login", "192.168.1.1", agora);
}
console.log(detectar("/api/login", "192.168.1.1", agora));

console.log("\n--- TESTE 3: Ataque Distribuído (25 IPs diferentes atacando) ---");
for (let i = 1; i <= 25; i++) {
  detectar("/api/admin", "10.0.0." + i, agora);
}
console.log(detectar("/api/admin", "10.0.0.99", agora));

console.log("\n--- TESTE 4: Teste de Memória RAM (após 65 segundos) ---");
const tempoFuturo = agora + 65000;
console.log(detectar("/api/login", "192.168.1.1", tempoFuturo));
console.log("-------------------------------------------\n");
