---
layout: default
title: Requesting a change
nav_order: 5
---

# Requesting a change

Every change to the server, whether to its content or to its platform, starts as an issue in this repository. Problems with what the server answers are reported the same way. Anyone can open one: users of the server for the content they need or a problem they found, and the maintainers for a platform upgrade or a fix they plan.

## Open an issue

[Open an issue](https://github.com/hl7-eu/tx.hl7europe.eu/issues/new), one per request, and say:

| Request | What to include |
|---|---|
| **Content**: add, update or remove a package or code system | the package id and version; whether to add, update or remove it; where it is published (listed on [packages.fhir.org](https://packages.fhir.org), or the address of its `package.tgz`); which specifications or projects need it, and by when |
| **Server platform**: an upgrade or a configuration change | what should change, and why it is needed |
| **Problem**: the server answers something unexpected | the endpoint (`/r4` or `/r5`); the request (the operation and its parameters, or the URL); the answer received; the answer expected |

Check the [Releases](releases/) page first: the current release lists the content the server carries, with its versions.

## What happens next

1. **Discussion in the issue.** For a server platform change or a problem, the maintainers of this repository decide in the issue, and say which release the change is planned for. A content request is for the terminology maintainers, those who maintain the terminology or package concerned: they check the request, or prepare the change themselves (for example updating a code system) and make the content available as a published package. The maintainers do not decide on content; they onboard it when it is ready and wanted.
2. **The maintainers onboard the change**, when it is ready, in a pull request that says `Closes #<issue>`. A content change contains the change to the server's content and a test that proves the content is served ([Adding content](content/adding-content.html)). A platform change contains the upgrade or configuration change and its test ([Updating the server](server/updates.html)). The issue closes when the pull request is merged.
3. **The change reaches the server with the next release.** The release notes link the issue; the release is deployed, and the deployment tests run against the live server ([Releasing](server/releasing.html)).
4. **The result is on the [Releases](releases/) page**: the release, its notes, and the test result for every source and check.

Follow the issue to see the discussion, and the Releases page to see when the change is live.
