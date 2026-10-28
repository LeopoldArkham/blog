const crypto = require('node:crypto');
const express = require('express');
const { marked } = require('marked');
const db = require('./db');
const views = require('./views');

const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || '127.0.0.1';
const PASSWORD = process.env.ADMIN_PASSWORD;
const SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');

if (!PASSWORD) {
  console.error('ADMIN_PASSWORD must be set');
  process.exit(1);
}

const app = express();
app.disable('x-powered-by');
// Behind Coolify's Traefik proxy: trust X-Forwarded-Proto so req.secure is right.
app.set('trust proxy', 1);
app.use(express.urlencoded({ extended: false, limit: '2mb' }));
app.use('/static', express.static(`${__dirname}/static`, { maxAge: '7d' }));

// --- auth: one admin, HMAC-signed session cookie ---------------------------

const COOKIE = 'blog_session';
const MAX_AGE_MS = 30 * 24 * 3600 * 1000;

const sign = (v) => crypto.createHmac('sha256', SECRET).update(v).digest('hex');

function safeEqual(a, b) {
  const ha = crypto.createHash('sha256').update(a).digest();
  const hb = crypto.createHash('sha256').update(b).digest();
  return crypto.timingSafeEqual(ha, hb);
}

function isAdmin(req) {
  const raw = (req.headers.cookie || '').split(/;\s*/).find((c) => c.startsWith(`${COOKIE}=`));
  if (!raw) return false;
  const [expires, mac] = decodeURIComponent(raw.slice(COOKIE.length + 1)).split('.');
  return !!mac && safeEqual(mac, sign(expires)) && Number(expires) > Date.now();
}

function requireAdmin(req, res, next) {
  if (isAdmin(req)) return next();
  res.redirect('/admin/login');
}

app.get('/admin/login', (req, res) => res.send(views.login()));

app.post('/admin/login', async (req, res) => {
  await new Promise((r) => setTimeout(r, 500)); // slow down guessing
  if (!safeEqual(String(req.body.password || ''), PASSWORD)) {
    return res.status(401).send(views.login('Wrong password'));
  }
  const expires = String(Date.now() + MAX_AGE_MS);
  res.cookie(COOKIE, `${expires}.${sign(expires)}`, {
    httpOnly: true, sameSite: 'strict', secure: req.secure, maxAge: MAX_AGE_MS,
  });
  res.redirect('/admin');
});

app.post('/admin/logout', (req, res) => {
  res.clearCookie(COOKIE);
  res.redirect('/');
});

// --- public ---------------------------------------------------------------

app.get('/', (req, res) => {
  res.send(views.index(db.listPublished(), isAdmin(req)));
});

app.get('/p/:slug', (req, res) => {
  const post = db.getPublished(req.params.slug);
  if (!post) return res.status(404).send(views.notFound());
  res.send(views.post(post, marked.parse(post.body), isAdmin(req)));
});

// --- admin ----------------------------------------------------------------

app.use('/admin', requireAdmin);

app.get('/admin', (req, res) => res.send(views.dashboard(db.listAll())));

app.get('/admin/new', (req, res) => res.send(views.editor()));

const fields = (body) => ({
  title: String(body.title || '').trim() || 'Untitled',
  slug: String(body.slug || '').trim(),
  body: String(body.body || ''),
});

// "action" is the button that was clicked: save | publish | unpublish
function applyAction(id, action) {
  if (action === 'publish') db.publish(id);
  if (action === 'unpublish') db.unpublish(id);
}

app.post('/admin/new', (req, res) => {
  const id = db.create(fields(req.body));
  applyAction(id, req.body.action);
  res.redirect(`/admin/edit/${id}?saved=1`);
});

app.get('/admin/edit/:id', (req, res) => {
  const post = db.get(Number(req.params.id));
  if (!post) return res.status(404).send(views.notFound());
  res.send(views.editor(post, req.query.saved === '1'));
});

app.post('/admin/edit/:id', (req, res) => {
  const id = Number(req.params.id);
  if (!db.get(id)) return res.status(404).send(views.notFound());
  db.update(id, fields(req.body));
  applyAction(id, req.body.action);
  res.redirect(`/admin/edit/${id}?saved=1`);
});

app.get('/admin/preview/:id', (req, res) => {
  const post = db.get(Number(req.params.id));
  if (!post) return res.status(404).send(views.notFound());
  res.send(views.post(post, marked.parse(post.body), true, true));
});

app.post('/admin/delete/:id', (req, res) => {
  db.remove(Number(req.params.id));
  res.redirect('/admin');
});

app.use((req, res) => res.status(404).send(views.notFound()));

app.listen(PORT, HOST, () => console.log(`Blog running on http://${HOST}:${PORT}`));
