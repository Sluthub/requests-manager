# Seerr Documentation

Seerr docs is built using [Docusaurus](https://docusaurus.io/), a modern static website generator.

Seerr docs will be available at [docs.seerr.dev](https://docs.seerr.dev).

### Installation

```bash
pnpm install
```

### Local Development

```bash
pnpm start
```

This command starts a local development server and opens up a browser window. Most changes are reflected live without having to restart the server.

### Build

```bash
pnpm build
```

This command generates static content in the `build` directory, which can then be served using any static content hosting service.

### Test API Rest documentation

This command generates REST API documentation.

```bash
pnpm gen-api-docs all
```

This command cleans REST API documentation.

```bash
pnpm clean-api-docs all
```

See [docusaurus-openapi-docs](https://github.com/PaloAltoNetworks/docusaurus-openapi-docs/tree/main#cli-usage) for more information.

### Dependency security

Docusaurus 3.10.2 still requests Tinypool 1.x. This workspace overrides that
dependency to 2.1.2, which fixes both worker filename prototype-pollution
advisories. Tinypool 2 drops Node 18 support; this workspace already requires
Node 22. Its constructor, `run`, and `destroy` APIs used by Docusaurus remain
compatible. Validate the override with API generation, type checking, and a
complete static build, including parallel page generation, before updating it.

The YAML overrides stay within their existing major versions. The scoped
`serialize-javascript` override fixes serialization vulnerabilities while
retaining the API used by `copy-webpack-plugin` and `css-minimizer-webpack-plugin`;
version 7 requires Node 20,
which is covered by this workspace's Node 22 requirement.
