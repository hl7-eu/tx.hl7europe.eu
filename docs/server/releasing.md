---
layout: default
title: Releasing
nav_order: 8
parent: Server setup
---

# Releasing a new edition of the server

A **release** is an edition of the server: the content selected in `library.yml`, the FHIRsmith server, and Caddy in front of it. Each release has release notes and a test status, both shown on the [Releases](../releases/) page.

```
issue ──► change (pull request, here or in another repository) ──► release notes ──► release ──► deploy ──► tests ──► Releases page
```

## Changes

- **Every change starts as an issue** in this repository: a content request ([Adding content](../content/adding-content.html)), a server update ([Updating the server](updates.html)), or a problem report. When the work itself happens elsewhere (a terminology package, an IG, FHIRsmith), the issue links to it and stays open until the result is on the server.
- **Every change here is a pull request** that says `Closes #<issue>` and has one label: `content`, `server`, `tests` or `docs`. The label decides where the change goes in the release notes.

## Release notes

Release notes are written on the GitHub release. *Generate release notes* fills them from the merged pull requests, grouped by label (see [`.github/release.yml`](https://github.com/hl7-eu/tx.hl7europe.eu/blob/master/.github/release.yml)). Then edit them into what a user of the server needs to know:

- **Content**: packages added, removed or moved to a new version, with the versions.
- **Server**: FHIRsmith and Caddy versions, and any behaviour change users will notice.
- **Known issues**: anything that's still wrong, with its issue.

## Releasing

1. Merge the pull requests that make up the release.
2. Deploy `master` on the server: see the *Deploy* steps of the procedure for each kind of change.
3. Create the release on GitHub: tag `vYYYY.MM.N` (for example `v2026.10.0`) on `master`, release notes as above, then **Publish**.
4. Publishing starts the **Deployment tests** workflow. It tests the live server with the tests as they are at the release's tag, and adds the result to the release on the Releases page.
5. If the tests fail, fix the server or the content and release again as `vYYYY.MM.N+1`. To re-test a release without changing it (after a server restart, for example), run the workflow by hand and give it the release tag.

Between releases, the workflow runs every Monday against the live server. Those runs are listed on the Releases page under *Latest checks between releases*, so a server that drifts (a package that disappeared, a restart that didn't load everything) shows up without waiting for the next release.
