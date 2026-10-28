# Blog

A dead-simple blog: write drafts in Markdown, publish them as articles. One admin, one SQLite file, two dependencies (Express and marked).

- `/`: list of published articles
- `/p/<slug>`: an article
- `/admin`: all posts, drafts and published (password protected)

## Run locally

Needs Node 22.5 or newer.

```bash
npm install
cp .env.example .env   # set ADMIN_PASSWORD
npm run dev
```

Open http://localhost:3000/admin.

## Deploy

Pushing to `master` deploys to the Hetzner server through Coolify. See
[`deploy/README.md`](deploy/README.md) for the one-time setup.

## Writing

- **Save draft** keeps a post private. Use **Preview** to see how it will look.
- **Publish** puts it on the front page. The publish date is set the first time you publish.
- **Unpublish** turns it back into a draft.
- `Cmd/Ctrl+S` saves without changing whether the post is published.
- The slug (URL) comes from the title unless you set one.
