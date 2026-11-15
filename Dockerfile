# Aegis — minimal, zero-dependency container image.
# The server is pure Node (node: built-ins only); no npm install at runtime.
# node:sqlite (DatabaseSync) requires Node >= 22 — setup.mjs enforces this too.
FROM node:22-alpine

WORKDIR /app

# Copy the server + shell + modules + scripts. Modules are served statically to the
# browser, so they must be present in the image.
COPY package.json ./
COPY server.js ./
COPY server/ ./server/
COPY aegis-shell/ ./aegis-shell/
COPY modules/ ./modules/
COPY scripts/ ./scripts/
# Runtime TSA adapter is imported on demand by server.js (adapters/tsa-rfc3161) when
# TSA verification is enabled, so it must be present in the image.
COPY adapters/ ./adapters/
# Compliance markdown templates are read at runtime by the doc-generation endpoints,
# so they must be present in the image.
COPY docs/ ./docs/
# NOTE: config/local.json is NEVER shipped (B-03: it holds a shared issuerSecret).
# Do not COPY config/ — after the packer excludes it the directory may not exist,
# and copying an empty/absent path breaks `docker build`. Create it at build time.

# Runtime config/data (SQLite, audit, generated TLS) lives here and should be
# mounted as volumes so it survives container restarts.
RUN mkdir -p /app/config /app/data /app/_audit /app/tls && chown -R node:node /app
VOLUME ["/app/config", "/app/data", "/app/_audit", "/app/tls"]

ENV PORT=8099
ENV AEGIS_DB=/app/data/aegis.db
EXPOSE 8099

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+process.env.PORT+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

# Run as non-root where possible; generate the issuer secret out-of-band and pass
# it as AEGIS_ISSUER_SECRET (a Docker/compose secret), or run `npm run setup`
# once to mint one into config/local.json.
USER node
CMD ["node", "server.js"]
