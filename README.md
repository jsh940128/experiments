# experiments.seunghwanlabs.com

The hub index for seunghwanlabs experiments — one browsable page listing each experiment
(`/resolve`, `/scope`, …). The shared Caddy on the Lightsail box serves this static index at
`/` and path-routes each experiment to its own container, so adding one later is "a container
+ a label," not a new subdomain.

## Structure

```
public/                    the served site
  index.html               the hub (bilingual EN/KO, light/dark)
  favicon.svg
docker-compose.prod.yml    the hub container (Caddy file-server) + edge labels
DEPLOY.md                  routing, DNS, the resolve.* → /resolve redirect, add-experiment steps
```

## Local preview

```bash
python3 -m http.server -d public 8000   # → http://localhost:8000
```

## Deploy

The site is mounted read-only into the container, so once it's running a `git pull` on the box
updates the live page with no rebuild. Full setup (DNS record, Caddy routes, the permanent 301
from the old `resolve.seunghwanlabs.com`) is in [DEPLOY.md](DEPLOY.md).
