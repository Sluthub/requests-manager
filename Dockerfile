FROM node:26.13.1-alpine3.23@sha256:39d8c143e60e99ae98f014bebea1e72fc96d3c9bdf9504bc3a27af5c05bfa39f AS base
ARG SOURCE_DATE_EPOCH
ARG TARGETPLATFORM
ENV TARGETPLATFORM=${TARGETPLATFORM:-linux/amd64}

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN npm install --global pnpm@10.24.0

COPY . ./app
WORKDIR /app

FROM base AS prod-deps

RUN --mount=type=cache,id=pnpm,target=/pnpm/store CI=true pnpm install --prod --frozen-lockfile

# Remove large native modules for linux-x64-gnu platform (we use alpine which is musl-based)
# not supported in pnpm for now due to this bug: https://github.com/pnpm/pnpm/issues/9654
RUN du -shL ./node_modules/.pnpm/* | grep '[0-9]M.*' | grep 'linux-x64-gnu@' | awk '{print $2}' | xargs rm -rf
# Remove large module files not needed for production
RUN if [ -d node_modules/.pnpm ]; then \
  find node_modules/.pnpm -type d \( \
  -path "*ace-builds/src-noconflict" -o \
  -path "*ace-builds/src" -o \
  -path "*ace-builds/src-min" -o \
  -path "*country-flag-icons/react" -o \
  -path "*country-flag-icons/string" -o \
  -path "*country-flag-icons/1x1" -o \
  -path "*@heroicons/react/16" \
  \) -exec rm -rf {} + || true; \
  fi

FROM base AS build

ARG COMMIT_TAG
ENV COMMIT_TAG=${COMMIT_TAG}

RUN \
  case "${TARGETPLATFORM}" in \
  'linux/arm64' | 'linux/arm/v7') \
  apk update && \
  apk add --no-cache python3 make g++ gcc libc6-compat bash && \
  npm install --global node-gyp \
  ;; \
  esac

RUN --mount=type=cache,id=pnpm,target=/pnpm/store CYPRESS_INSTALL_BINARY=0 pnpm install --frozen-lockfile

RUN pnpm build

RUN rm -rf .next/cache

# Keep the registry archive out of the final image by mounting it from this stage.
FROM scratch AS npm-runtime-archive
ADD --checksum=sha256:ee5fc68e724c4bdba38db9d96d9c661d4e736e4be7001ae44d2fbbaa52159514 https://registry.npmjs.org/npm/-/npm-11.21.3.tgz /npm.tgz

FROM node:26.13.1-alpine3.23@sha256:39d8c143e60e99ae98f014bebea1e72fc96d3c9bdf9504bc3a27af5c05bfa39f
ARG SOURCE_DATE_EPOCH
ARG COMMIT_TAG
ENV NODE_ENV=production
ENV COMMIT_TAG=${COMMIT_TAG}

RUN apk add --no-cache tzdata

# Replace the complete npm release so old bundled dependencies are absent at runtime.
RUN --network=none --mount=type=bind,from=npm-runtime-archive,source=/npm.tgz,target=/tmp/npm-runtime.tgz \
    set -eu; \
    staging_dir="$(mktemp -d)"; \
    tar -xzf /tmp/npm-runtime.tgz -C "$staging_dir"; \
    rm -rf /usr/local/lib/node_modules/npm; \
    mv "$staging_dir/package" /usr/local/lib/node_modules/npm; \
    rmdir "$staging_dir"; \
    node -e 'const assert = require("node:assert/strict"); \
      const { readFileSync } = require("node:fs"); \
      const root = "/usr/local/lib/node_modules/npm/"; \
      for (const [path, version] of [ \
        ["package.json", "11.21.3"], \
        ["node_modules/undici/package.json", "6.29.1"], \
        ["node_modules/brace-expansion/package.json", "5.0.12"] \
      ]) assert.equal(JSON.parse(readFileSync(root + path, "utf8")).version, version, path);'; \
    test -x /usr/local/bin/npm; \
    test -x /usr/local/bin/npx; \
    test "$(readlink -f /usr/local/bin/npm)" = /usr/local/lib/node_modules/npm/bin/npm-cli.js; \
    test "$(readlink -f /usr/local/bin/npx)" = /usr/local/lib/node_modules/npm/bin/npx-cli.js

USER node:node

WORKDIR /app

COPY --chown=node:node . .
COPY --chown=node:node --from=prod-deps /app/node_modules ./node_modules
COPY --chown=node:node --from=build /app/.next ./.next
COPY --chown=node:node --from=build /app/dist ./dist

RUN touch config/DOCKER && \
  echo "{\"commitTag\": \"${COMMIT_TAG}\"}" > committag.json

EXPOSE 5055

CMD [ "npm", "start" ]
