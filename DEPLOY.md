# Deploying the experiments hub

`experiments.seunghwanlabs.com` is one browsable index over a growing set of experiments,
each living at a path (`/resolve`, `/scope`, …) instead of its own subdomain. It rides the
**same shared Lightsail box + label-driven Caddy** as the API services, so adding an
experiment later is "a container + a label," never a new subdomain to provision.

```
 Cloudflare DNS · experiments  → A <box-ip>  (grey / DNS-only, Caddy does TLS)

 AWS Lightsail <box-ip> · shared caddy-docker-proxy (owns :80/:443)
   experiments.seunghwanlabs.com
     /resolve/*  → oversight-api : 8000   (single-origin: Resolve SPA + API)
     /scope/*    → scope-api     : 8000   (single-origin: Scope UI + API)
     /*          → experiments-hub         (this repo's static index)

 resolve.seunghwanlabs.com  → 301 → experiments.seunghwanlabs.com/resolve   (kept forever)
```

Design note: the two experiments are served single-origin (each FastAPI container serves its
own UI **and** API), so Caddy `handle_path` strips the prefix and the app just needs to know
its mount point. Symmetric, no CORS, and every future experiment follows the same shape.

## Step 1 — DNS

Cloudflare DNS for `seunghwanlabs.com`: add **A `experiments` → `<box-ip>`, DNS-only
(grey cloud)** — same as the existing `api` / `scope` records — so the shared Caddy can
complete its own ACME challenge and issue the cert.

## Step 2 — The hub container

The hub is static (`index.html` + `favicon.svg`). Serve it from a tiny container on the box,
joined to the `edge` network so the shared Caddy can reach it. This repo's
`docker-compose.prod.yml`:

```yaml
services:
  hub:
    image: caddy:2-alpine
    container_name: experiments-hub
    restart: unless-stopped
    entrypoint: caddy
    command: file-server --root /srv --listen :80
    volumes:
      - ./public:/srv:ro    # only the static files are served, not the repo root
    networks: [edge]
    labels:
      caddy: experiments.seunghwanlabs.com
      # catch-all root — ordered LAST so the path routes below win first
      caddy.9_handle: /*
      caddy.9_handle.reverse_proxy: "{{upstreams 80}}"
      caddy.encode: gzip
networks:
  edge:
    external: true
```

## Step 3 — The two path routes (labels on the app containers)

The routes live as labels on the existing service containers, in their own repos (so each
experiment still owns its own config). `handle_path` strips the prefix before proxying, and
the numeric prefixes order the matchers ahead of the hub's catch-all:

**`oversight-paradox` → `docker-compose.prod.yml`, on the `api` service** (add alongside the
existing `api.seunghwanlabs.com` label, which stays as the direct API host):
```yaml
    labels:
      caddy_1: experiments.seunghwanlabs.com
      caddy_1.1_handle_path: /resolve/*
      caddy_1.1_handle_path.reverse_proxy: "{{upstreams 8000}}"
```

**`scope` → `docker-compose.prod.yml`, on the `api` service:**
```yaml
    labels:
      caddy_1: experiments.seunghwanlabs.com
      caddy_1.2_handle_path: /scope/*
      caddy_1.2_handle_path.reverse_proxy: "{{upstreams 8000}}"
```

> The equivalent hand-written Caddyfile (source of truth for what the labels must produce —
> worth confirming with `docker exec <caddy> caddy adapt` after first deploy, since
> caddy-docker-proxy's cross-container matcher ordering is the one finicky part):
> ```
> experiments.seunghwanlabs.com {
>     encode gzip
>     handle_path /resolve/* { reverse_proxy oversight-api:8000 }
>     handle_path /scope/*   { reverse_proxy scope-api:8000 }
>     handle                 { reverse_proxy experiments-hub:80 }
> }
> ```

## Step 4 — App-side base-path fixes (in their repos)

Both UIs currently hardcode root-absolute asset paths, which 404 under a subpath. One change each:

- **scope** — `app/static/index.html`: drop the leading slash on the `/style.css`, `/app.js`,
  `/logo.svg`, `/favicon.svg`, `/apple-touch-icon.png` refs (relative URLs resolve correctly
  both at today's `scope.seunghwanlabs.com` root **and** under `/scope/`, so this ships safely
  on its own, no `<base href>` and no coupling to the cutover). Make `app/static/app.js`'s
  `fetch()` calls relative too. Caddy redirects `/scope` → `/scope/` so there's a base to
  resolve against; FastAPI `root_path="/scope"`.
- **oversight** — `oversight-web/vite.config.ts`: `base: "/resolve/"`, router `basename="/resolve"`,
  build with `VITE_API_BASE=/resolve` (single-origin), drop `FRONTEND_ORIGIN`. Ship via the
  existing `build.sh` (copies `dist` into `oversight-api/static`); FastAPI `root_path="/resolve"`.

These are staged as separate reviewable commits in each repo.

## Step 5 — Redirect the old Resolve URL (permanent)

Keep every existing Prolific / IRB / published link alive. On Cloudflare DNS, leave
`resolve.seunghwanlabs.com` pointing at the box and add a **301** to
`https://experiments.seunghwanlabs.com/resolve{uri}` (Cloudflare Bulk Redirect, or a Caddy
`redir` on a `resolve.seunghwanlabs.com` site block). This redirect is permanent, not a
temporary bridge. Swap the canonical URL registered with Prolific / the IRB on your own
schedule, between runs.

## Adding experiment N later

1. Build it as a self-contained container that serves its own UI+API under a base path
   (`/thing`), joined to the `edge` network.
2. Add two labels: `caddy_1: experiments.seunghwanlabs.com` and a
   `caddy_1.N_handle_path: /thing/*` → `reverse_proxy {{upstreams <port>}}`.
3. Add one row to this repo's `index.html`.

No DNS change, no new cert, nothing else touched.
