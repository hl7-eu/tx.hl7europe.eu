---
layout: default
title: Requesting a change
nav_order: 5
---

# Requesting a change

Every change to the server, whether to its content, the FHIRsmith server or Caddy, starts as an issue in this repository. Problems with what the server answers are reported the same way.

## Open an issue

[Open an issue](https://github.com/hl7-eu/tx.hl7europe.eu/issues/new), one per request, and say:

| Request | What to include |
|---|---|
| **Content**: add, update or remove a package or code system | the package id and version; whether to add, update or remove it; where it is published (listed on [packages.fhir.org](https://packages.fhir.org), or the address of its `package.tgz`); which specifications or projects need it, and by when |
| **Server**: a new FHIRsmith or Caddy version, or a configuration change | the component and the version or change; why it is needed |
| **Problem**: the server answers something unexpected | the endpoint (`/r4` or `/r5`); the request (the operation and its parameters, or the URL); the answer received; the answer expected |

Check the [Releases](releases/) page first: the current release lists the content the server carries, with its versions.

## What happens next

1. **Discussion and decision in the issue.** The maintainers of this repository review the request and answer in the issue: questions, the decision, and the release it is planned for.
2. **The change is a pull request** that says `Closes #<issue>`. A content change contains the `library.yml` change and a test that proves the content is served ([Adding content](content/adding-content.html)). A server change contains the new version and its test ([Updating the server](server/updates.html)). The issue closes when the pull request is merged.
3. **The change reaches the server with the next release.** The release notes link the issue; the release is deployed, and the deployment tests run against the live server ([Releasing](server/releasing.html)).
4. **The result is on the [Releases](releases/) page**: the release, its notes, and the test result for every source and check.

Follow the issue to see the discussion, and the Releases page to see when the change is live.
