const path = require('node:path');
const fs = require('node:fs');
const { DatabaseSync } = require('node:sqlite');

const dataDir = process.env.DATA_DIR || path.join(__dirname, 'data');
fs.mkdirSync(dataDir, { recursive: true });

const db = new DatabaseSync(path.join(dataDir, 'blog.db'));
db.exec(`
  PRAGMA journal_mode = WAL;
  CREATE TABLE IF NOT EXISTS posts (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    title        TEXT NOT NULL,
    slug         TEXT NOT NULL UNIQUE,
    body         TEXT NOT NULL DEFAULT '',
    published_at TEXT,            -- NULL means draft
    created_at   TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at   TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

const q = {
  published: db.prepare(`SELECT * FROM posts WHERE published_at IS NOT NULL ORDER BY published_at DESC`),
  all: db.prepare(`SELECT * FROM posts ORDER BY (published_at IS NOT NULL), COALESCE(published_at, updated_at) DESC`),
  bySlug: db.prepare(`SELECT * FROM posts WHERE slug = ? AND published_at IS NOT NULL`),
  byId: db.prepare(`SELECT * FROM posts WHERE id = ?`),
  slugTaken: db.prepare(`SELECT COUNT(*) AS n FROM posts WHERE slug = ? AND id != ?`),
  insert: db.prepare(`INSERT INTO posts (title, slug, body) VALUES (?, ?, ?)`),
  update: db.prepare(`UPDATE posts SET title = ?, slug = ?, body = ?, updated_at = datetime('now') WHERE id = ?`),
  publish: db.prepare(`UPDATE posts SET published_at = COALESCE(published_at, datetime('now')) WHERE id = ?`),
  unpublish: db.prepare(`UPDATE posts SET published_at = NULL WHERE id = ?`),
  remove: db.prepare(`DELETE FROM posts WHERE id = ?`),
};

// Node 22.5's get() returns a row of NULLs instead of undefined when nothing matches.
const one = (stmt, ...args) => {
  const row = stmt.get(...args);
  return row && row.id != null ? row : undefined;
};

function slugify(s) {
  return s.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'post';
}

// Make a slug unique by appending -2, -3, ... if needed.
function uniqueSlug(base, id = 0) {
  let slug = slugify(base);
  for (let n = 2; q.slugTaken.get(slug, id).n > 0; n++) slug = `${slugify(base)}-${n}`;
  return slug;
}

module.exports = {
  listPublished: () => q.published.all(),
  listAll: () => q.all.all(),
  getPublished: (slug) => one(q.bySlug, slug),
  get: (id) => one(q.byId, id),
  create({ title, slug, body }) {
    const s = uniqueSlug(slug || title);
    return Number(q.insert.run(title, s, body).lastInsertRowid);
  },
  update(id, { title, slug, body }) {
    q.update.run(title, uniqueSlug(slug || title, id), body, id);
  },
  publish: (id) => q.publish.run(id),
  unpublish: (id) => q.unpublish.run(id),
  remove: (id) => q.remove.run(id),
};
