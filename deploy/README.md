# Deploying the blog

The blog runs on the Hetzner server (`167.233.56.221`) through **Coolify**,
whose dashboard is at `http://167.233.56.221:8000`, the same way as smert.
Coolify builds the `Dockerfile` from GitHub, runs the container, and routes
web traffic to it through its Traefik proxy. The database lives in a Docker
volume mounted at `/data`, which survives redeploys.

## One-time setup

### 1. Create the app in Coolify

In the dashboard: **Projects → your project → + New → Public Repository**.

- Repository URL: `https://github.com/LeopoldArkham/blog`, branch `master`
- Build Pack: **Dockerfile**

Then, in the app's settings:

- **General → Ports Exposes**: `3000`
- **General → Domains**: keep the generated `http://….167.233.56.221.sslip.io`
  address for now; replace it with your own domain later (Coolify then gets
  HTTPS certificates by itself).
- **Persistent Storage → + Add → Volume**: destination path `/data`.
- **Environment Variables**:
  - `ADMIN_PASSWORD`: the password for `/admin`
  - `SESSION_SECRET`: output of `openssl rand -hex 32`. Without it you are
    logged out on every deploy.
  - `BLOG_TITLE`: the name shown at the top of every page
- Leave the health check off: the image has no `curl` for Coolify to run it.

Click **Deploy**, then log in at `<your domain>/admin`.

The live app is `blog` in the Coolify project **Blog**, and its volume is
`90ch8tmj0hi7rkzxlpxf6wes-blog-data`, created on 2026-10-28.

### 2. Deploy on every push

Public repositories don't get automatic deploys. In the app's **Webhooks**
section, copy the GitHub webhook URL and set a secret, then add them in GitHub
under **Settings → Webhooks → Add webhook** (content type `application/json`,
"Just the push event").

## Day to day

- **Logs, restarts, rollbacks**: the app's page in Coolify (Deployments lists
  previous builds; any of them can be redeployed).
- **Settings**: `DATA_DIR`, `HOST` and `PORT` are set in the `Dockerfile`;
  override them in Coolify's Environment Variables if needed.
- **Data**: everything is in `blog.db` in the volume. To copy it off the
  server, find the volume's path with `docker volume inspect` and use
  `sqlite3 blog.db ".backup /tmp/blog.db"`, which is safe while the app runs.
