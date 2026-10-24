---
layout: default
title: Adding content
nav_order: 6
parent: Content
---

# Adding or updating a package

The server's content is the list of sources in [`server/config/library.yml`](https://github.com/hl7-eu/tx.hl7europe.eu/blob/master/server/config/library.yml). FHIRsmith reads it when it starts. Adding a package, or moving a package to a new version, is a change to that list **plus a test that proves the new content is served**. The test is part of the same pull request.

> **The terminology server does not support POSTs or PUTs of terminology content.** Everything it serves comes from `library.yml`.

## 1. Open an issue

One issue per request ("add `hl7.eu.terminology.xyz` 0.1.0", "update eHDSI to 0.3.0"). If the content itself is made in another repository (an EU terminology package, for example), link that repository's release from the issue.

## 2. Change `library.yml`

On a branch, edit the `sources:` list. Each line is `<kind>:<reference>`:

| Kind | Example | Use for |
|---|---|---|
| `npm:` | `npm:hl7.eu.terminology.ehdsi#0.2.0` | a FHIR package **published in the FHIR package registry**. Without `#version` the server loads the current version at every start |
| `url:` | `url:https://hl7-eu.github.io/hl7.eu.terminology.common/package.tgz` | a package that is **not in the registry**, fetched from that address |
| `loinc:`, `unii:`, `snomed:`, `ucum:` … | `loinc:loinc-2.81-b.db` | a cache file in the server's data folder |
| `internal:` | `internal:lang` | a code system built into FHIRsmith |

Name a version (`#x.y.z`) for every package that is ours or that IGs depend on. An unversioned entry changes whenever its publisher releases, and the tests cannot say which version it should be.

Check that the package is where the line says it is. For `npm:` packages, `https://packages.fhir.org/<package-id>` must list the version. If it doesn't, use `url:`.

## 3. Add or update the test

Every active line in `library.yml` must have a test. The run reports any line without one as *not tested*. Tests live in [`tests/features/`](https://github.com/hl7-eu/tx.hl7europe.eu/tree/master/tests/features), one feature per package (or one per group of related sources). The feature is tagged with the exact `library.yml` line:

```gherkin
@library:npm:hl7.eu.terminology.ehdsi#0.2.0
Feature: Package hl7.eu.terminology.ehdsi#0.2.0 is served
```

When a package changes version, update the tag and the versions in the scenarios. For a new package, write at least:

- a **`$lookup`** of a code in a CodeSystem the package defines, naming the package version, and checking the display;
- a **`$validate-code`** of a code in a ValueSet the package defines, with `valueSetVersion` set to the package version;
- where it matters, an **`$expand`** of that ValueSet, checking the expansion's `version`.

Pinning the version in each request is what makes the test prove *this* package version is served, and not an earlier one still in the server's cache. Use codes taken from the package itself. See [Testing](../testing.html) for the sentences available and how to run the tests.

Before the change is deployed, run the new tests against the live server. They **should fail**, because the content isn't there yet. A test that already passes doesn't test the change.

## 4. Pull request

Open a pull request that says `Closes #<issue>` and carries the label `content`. It contains the `library.yml` change and the test. Merge it once reviewed.

## 5. Deploy

On the server, in the `server/` folder of the checkout:

```bash
git pull
sudo docker compose up -d --force-recreate fhirserver   # FHIRsmith reads library.yml at start-up
sudo docker compose logs -f fhirserver
```

Wait for the start-up to finish. The log lists each package it loaded, with its version:

```
{tx}:  1568 hl7.eu.terminology.ehdsi0.2.0     2   244
```

If the version you added isn't in that list, the server couldn't fetch the package. Check the source line (step 2) before going further.

## 6. Test the deployment

Run the **Deployment tests** workflow (Actions → Deployment tests → Run workflow), or publish the release that contains the change (see [Releasing](../server/releasing.html)). The result appears on the [Releases](../releases/) page.
