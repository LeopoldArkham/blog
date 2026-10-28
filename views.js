const BLOG_TITLE = process.env.BLOG_TITLE || 'My Blog';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
));

// SQLite datetime('now') is UTC without a zone marker.
const fmtDate = (s) => new Date(`${s.replace(' ', 'T')}Z`).toLocaleDateString('en-GB', {
  day: 'numeric', month: 'long', year: 'numeric',
});

function layout(title, content, { admin = false } = {}) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(title ? `${title} · ${BLOG_TITLE}` : BLOG_TITLE)}</title>
  <link rel="stylesheet" href="/static/style.css">
</head>
<body>
  <header class="site">
    <a class="brand" href="/">${esc(BLOG_TITLE)}</a>
    ${admin ? `<nav>
      <a href="/admin">Posts</a>
      <a href="/admin/new">New post</a>
      <form method="post" action="/admin/logout"><button class="link">Log out</button></form>
    </nav>` : ''}
  </header>
  <main>${content}</main>
</body>
</html>`;
}

exports.index = (posts, admin) => layout('', posts.length
  ? `<ul class="posts">${posts.map((p) => `
      <li><a href="/p/${esc(p.slug)}">${esc(p.title)}</a>
      <time>${fmtDate(p.published_at)}</time></li>`).join('')}
    </ul>`
  : '<p class="muted">Nothing here yet.</p>', { admin });

exports.post = (post, html, admin, preview = false) => layout(post.title, `
  ${preview ? `<p class="banner">Preview${post.published_at ? '' : ' of a draft'} ·
    <a href="/admin/edit/${post.id}">back to editor</a></p>` : ''}
  <article>
    <h1>${esc(post.title)}</h1>
    ${post.published_at ? `<time>${fmtDate(post.published_at)}</time>` : ''}
    <div class="body">${html}</div>
  </article>
  ${admin && !preview ? `<p><a href="/admin/edit/${post.id}">Edit this post</a></p>` : ''}
`, { admin });

exports.login = (error) => layout('Log in', `
  <form method="post" action="/admin/login" class="login">
    <h1>Log in</h1>
    ${error ? `<p class="error">${esc(error)}</p>` : ''}
    <input type="password" name="password" placeholder="Password" autofocus required>
    <button>Log in</button>
  </form>`);

exports.dashboard = (posts) => layout('Posts', `
  <h1>Posts</h1>
  ${posts.length ? `<table class="dash">${posts.map((p) => `
    <tr>
      <td><a href="/admin/edit/${p.id}">${esc(p.title)}</a></td>
      <td>${p.published_at
        ? `<span class="tag pub">Published</span>`
        : `<span class="tag draft">Draft</span>`}</td>
      <td class="muted">${fmtDate(p.published_at || p.updated_at)}</td>
    </tr>`).join('')}
  </table>` : '<p class="muted">No posts yet. <a href="/admin/new">Write one</a>.</p>'}
`, { admin: true });

exports.editor = (post, saved) => {
  const isNew = !post;
  const published = !!post?.published_at;
  return layout(isNew ? 'New post' : `Edit: ${post.title}`, `
  <form method="post" action="${isNew ? '/admin/new' : `/admin/edit/${post.id}`}" class="editor">
    <div class="editor-head">
      <h1>${isNew ? 'New post' : 'Edit post'}</h1>
      ${isNew ? '' : (published
        ? `<span class="tag pub">Published</span> <a href="/p/${esc(post.slug)}">view</a>`
        : `<span class="tag draft">Draft</span>`)}
      ${saved ? '<span class="saved">Saved</span>' : ''}
    </div>
    <input name="title" placeholder="Title" value="${esc(post?.title)}" required autofocus>
    <label class="slug">/p/<input name="slug" placeholder="auto-from-title" value="${esc(post?.slug)}"></label>
    <textarea name="body" rows="24" placeholder="Write in Markdown…">${esc(post?.body)}</textarea>
    <p class="muted hint">Markdown: **bold**, *italic*, # Heading, [link](https://…), - list, &gt; quote, \`code\`, ![image](url)</p>
    <div class="actions">
      ${published
        ? `<button name="action" value="save">Update</button>
           <button name="action" value="unpublish" class="secondary">Unpublish</button>`
        : `<button name="action" value="save" class="secondary">Save draft</button>
           <button name="action" value="publish">Publish</button>`}
      ${isNew ? '' : `<a href="/admin/preview/${post.id}">Preview</a>`}
    </div>
  </form>
  ${isNew ? '' : `<form method="post" action="/admin/delete/${post.id}"
      onsubmit="return confirm('Delete this post for good?')">
    <button class="link danger">Delete post</button>
  </form>`}
  <script>
    // Cmd/Ctrl+S saves without changing the published state.
    document.addEventListener('keydown', (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        document.querySelector('.editor button[value=save]').click();
      }
    });
  </script>
`, { admin: true });
};

exports.notFound = () => layout('Not found', '<h1>Not found</h1><p><a href="/">Back home</a></p>');
