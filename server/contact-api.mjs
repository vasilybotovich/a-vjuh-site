import http from 'node:http';
import fs from 'node:fs';

const crmUrl = process.env.CRM_URL || 'https://sm.a-vjuh.ru/api/mcp/mcp';
const token = fs.readFileSync(process.env.CRM_TOKEN_FILE || '/run/secrets/crm_token', 'utf8').trim();
const port = Number(process.env.PORT || 3000);
const requests = new Map();
let rpcId = 0;

async function rpc(name, args) {
  const response = await fetch(crmUrl, {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json', accept: 'application/json, text/event-stream' },
    body: JSON.stringify({ jsonrpc: '2.0', id: ++rpcId, method: 'tools/call', params: { name, arguments: args } }),
  });
  const body = await response.text();
  if (!response.ok) throw new Error(`CRM HTTP ${response.status}`);
  const dataLine = body.split(/\r?\n/).find((line) => line.startsWith('data: '));
  const envelope = JSON.parse(dataLine ? dataLine.slice(6) : body);
  if (envelope.error || envelope.result?.isError) throw new Error('CRM rejected request');
  return JSON.parse(envelope.result.content[0].text).data;
}

function reply(res, status, payload) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
  res.end(JSON.stringify(payload));
}
function clean(value, max) {
  return typeof value === 'string' ? value.trim().replace(/[\u0000-\u001f]/g, ' ').slice(0, max) : '';
}
function allowed(ip) {
  const now = Date.now();
  const recent = (requests.get(ip) || []).filter((time) => now - time < 3600000);
  if (recent.length >= 5) return false;
  recent.push(now);
  requests.set(ip, recent);
  return true;
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'GET' && req.url === '/health') return reply(res, 200, { ok: true });
  if (req.method !== 'POST' || req.url !== '/api/contact') return reply(res, 404, { error: 'Not found' });
  const origin = req.headers.origin;
  if (origin && !['https://a-vjuh.ru', 'https://www.a-vjuh.ru'].includes(origin)) return reply(res, 403, { error: 'Недопустимый источник' });
  const ip = String(req.headers['x-forwarded-for'] || req.socket.remoteAddress).split(',')[0].trim();
  if (!allowed(ip)) return reply(res, 429, { error: 'Слишком много заявок. Попробуйте позже' });
  try {
    let raw = '';
    for await (const chunk of req) {
      raw += chunk;
      if (raw.length > 12000) throw new Error('Payload too large');
    }
    const input = JSON.parse(raw);
    if (input.website) return reply(res, 200, { ok: true });
    const name = clean(input.name, 120), company = clean(input.company, 160);
    const contact = clean(input.contact, 200), message = clean(input.message, 4000);
    if (!name || !contact || !message) return reply(res, 400, { error: 'Заполните обязательные поля' });
    const names = name.split(/\s+/);
    const lead = await rpc('crm_create_lead', {
      firstName: names.length > 1 ? names.slice(0, -1).join(' ') : undefined,
      lastName: names.at(-1), company: company || undefined,
      email: contact.includes('@') && !contact.startsWith('@') ? contact : undefined,
    });
    const users = await rpc('crm_list_users', { query: 'Марк Ветров', status: 'ACTIVE', limit: 20, offset: 0 });
    const mark = users.find((user) => user.name === 'Марк Ветров');
    if (mark) await rpc('crm_update_lead', { id: lead.id, assigned_to: mark.id });
    await rpc('crm_create_activity', {
      type: 'note', title: `Заявка с a-vjuh.ru: ${company || name}`,
      description: `Имя: ${name}\nКомпания: ${company || 'не указана'}\nКонтакт: ${contact}\n\nЗадача:\n${message}`,
      date: new Date().toISOString(), outcome: 'Новая заявка с сайта', status: 'completed',
      links: [{ entityType: 'lead', entityId: lead.id }],
    });
    return reply(res, 201, { ok: true });
  } catch (error) {
    console.error(new Date().toISOString(), error.message);
    return reply(res, 500, { error: 'Не удалось отправить заявку' });
  }
});
server.listen(port, '0.0.0.0', () => console.log(`contact-api listening on ${port}`));
