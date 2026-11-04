const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const {timingSafeEqual} = require('node:crypto');
const push = require('web-push');

const {BELL_KEY, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_CONTACT, DATA_DIR, PORT = 3000,
  DASHBOARD_ORIGIN = 'https://jeremyrugby24-wq.github.io'} = process.env;
if (!BELL_KEY || BELL_KEY.length < 24 || !VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY || !VAPID_CONTACT || !DATA_DIR) {
  throw new Error('Configurer BELL_KEY, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_CONTACT et DATA_DIR.');
}
push.setVapidDetails(VAPID_CONTACT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
const file = path.join(DATA_DIR, 'tablette.json');
const expected = Buffer.from('Bearer ' + BELL_KEY);
let pending = Promise.resolve(), lastRing = 0;
const allowedPushHosts = new Set(['fcm.googleapis.com','updates.push.services.mozilla.com','web.push.apple.com']);

async function parse(req) {
  let body = '';
  for await (const chunk of req) {
    body += chunk;
    if (body.length > 8192) throw new Error('Message trop long.');
  }
  return JSON.parse(body);
}

function validSubscription(data) {
  try {
    const endpoint = new URL(data.endpoint);
    return endpoint.protocol === 'https:' && !endpoint.username && !endpoint.password && !endpoint.port &&
      allowedPushHosts.has(endpoint.hostname) &&
      /^[A-Za-z0-9_-]{80,100}$/.test(data.keys.p256dh) &&
      /^[A-Za-z0-9_-]{20,30}$/.test(data.keys.auth);
  } catch { return false; }
}

http.createServer(async (req, res) => {
  const reply = (status, data) => {
    res.writeHead(status, {'Content-Type':'application/json', 'Cache-Control':'no-store'});
    res.end(JSON.stringify(data));
  };
  if (req.headers.origin !== DASHBOARD_ORIGIN) return reply(403, {error:'Origine refusée.'});
  res.setHeader('Access-Control-Allow-Origin', DASHBOARD_ORIGIN);
  res.setHeader('Vary','Origin');
  res.setHeader('Access-Control-Allow-Methods','POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers','Content-Type, Authorization');
  if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }
  if (req.method !== 'POST') return reply(405, {error:'Méthode refusée.'});
  const provided = Buffer.from(req.headers.authorization || '');
  if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) {
    return reply(401, {error:'Code privé incorrect.'});
  }

  let data;
  try { data = await parse(req); } catch { return reply(400, {error:'Requête invalide.'}); }
  if (req.url === '/key') return reply(200, {publicKey: VAPID_PUBLIC_KEY});
  if (req.url === '/subscribe') {
    if (!validSubscription(data)) return reply(400, {error:'Abonnement de notification invalide.'});
    const save = pending.then(async () => {
      await fs.mkdir(DATA_DIR, {recursive:true, mode:0o700});
      await fs.writeFile(file + '.tmp', JSON.stringify(data), {mode:0o600});
      await fs.rename(file + '.tmp', file);
    });
    pending = save.catch(() => {});
    try { await save; return reply(200, {ok:true}); }
    catch { return reply(500, {error:'Impossible d’enregistrer la tablette.'}); }
  }
  if (req.url !== '/ring') return reply(404, {error:'Adresse inconnue.'});
  const message = typeof data?.message === 'string' ? data.message.trim() : '';
  if (!message || message.length > 160) return reply(400, {error:'Écris un message de 1 à 160 caractères.'});
  if (Date.now() - lastRing < 3000) return reply(429, {error:'Attends quelques secondes avant de renvoyer.'});
  lastRing = Date.now();
  try {
    await pending;
    const subscription = JSON.parse(await fs.readFile(file, 'utf8'));
    await push.sendNotification(subscription, JSON.stringify({message}), {TTL:120, urgency:'high', timeout:10000});
    return reply(200, {ok:true});
  } catch (error) {
    if (error.code === 'ENOENT' || [404,410].includes(error.statusCode)) {
      return reply(409, {error:'Active les notifications sur la tablette.'});
    }
    return reply(502, {error:'Le service de notification n’a pas accepté le message.'});
  }
}).listen(Number(PORT));
