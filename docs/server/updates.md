---
layout: default
title: Updating the server
nav_order: 7
parent: Server setup
---

# Updating the server code

The server code is two images in [`server/docker-compose.yml`](https://github.com/hl7-eu/tx.hl7europe.eu/blob/master/server/docker-compose.yml): **FHIRsmith** (`ghcr.io/healthintersections/fhirsmith`), the terminology server, and **Caddy** (`caddy`), the HTTPS proxy in front of it, configured by [`server/caddy/Caddyfile`](https://github.com/hl7-eu/tx.hl7europe.eu/blob/master/server/caddy/Caddyfile).

FHIRsmith is pinned to a version: an update is a change to that version in the repository, so it is reviewed, released and can be rolled back. Caddy uses `caddy:2`, which follows the latest Caddy 2 release; whether to pin it is [#15](https://github.com/hl7-eu/tx.hl7europe.eu/issues/15).

## FHIRsmith

1. **Read the release.** New versions are listed at [HealthIntersections/FHIRsmith releases](https://github.com/HealthIntersections/FHIRsmith/releases). Note any change to configuration (`config.json`, `library.yml` format) or to terminology behaviour that IG authors would notice.
2. **Open an issue** ("update FHIRsmith to 0.19.0") and a branch.
3. **Change the version in two places**, in the same commit:
   - `server/docker-compose.yml`: `image: ghcr.io/healthintersections/fhirsmith:<version>`
   - `tests/features/server.feature` and `tests/features/server-r5.feature`: `software.version = '<version>'`. The tests check both endpoints report the release the compose file names.
4. **Pull request** with `Closes #<issue>`.
5. **Deploy** on the server, in the `server/` folder of the checkout. First note the running version, so you can go back to it:

   ```bash
   sudo docker compose images fhirserver        # the version you are leaving
   git pull
   sudo docker compose pull fhirserver
   sudo docker compose up -d fhirserver
   sudo docker compose ps                        # wait for (healthy)
   ```

6. **Test** with the Deployment tests workflow, or by publishing the release (see [Releasing](releasing.html)). All the content tests run too, because a new server version can change how content is loaded.
7. **Roll back** if the tests fail in a way the new version caused: put the previous version back in `docker-compose.yml`, `git pull` on the server and run `sudo docker compose up -d fhirserver` again. Record what failed in the issue.

## Caddy

Caddy changes less often, and its configuration matters more than its version.

- **Image:** `caddy:2` takes the latest Caddy 2 release on `sudo docker compose pull caddy`. To find what's running: `sudo docker compose exec caddy caddy version`. There is no version test for Caddy; the deployment tests reach the server through it, so a broken proxy fails all of them.
- **Caddyfile:** a change to routing (`/r4`, `/r5`), blocked paths or user agents is a server change too: issue, pull request, then on the server `git pull` and `sudo docker compose restart caddy`. Certificates are kept in the `caddy_data` volume across restarts.

## Tooling for the tests

The deployment tests themselves run on pinned versions of the OpenTestBed tools (`ITB_CLI_REF` and `AUTHORING_REF` in [`.github/workflows/tests.yml`](https://github.com/hl7-eu/tx.hl7europe.eu/blob/master/.github/workflows/tests.yml)). Bump them in their own pull request, and confirm that a manual run of the workflow gives the same result as before.
