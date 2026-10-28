FROM node:22-bookworm-slim
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund
COPY server.js db.js views.js ./
COPY static ./static

RUN useradd --system --uid 10001 --home-dir /data blog \
 && install -d -o blog -g blog /data

# Mount a persistent volume here: it holds blog.db.
ENV NODE_ENV=production \
    DATA_DIR=/data \
    HOST=0.0.0.0 \
    PORT=3000
VOLUME /data
EXPOSE 3000
USER blog
CMD ["node", "--experimental-sqlite", "--disable-warning=ExperimentalWarning", "server.js"]
