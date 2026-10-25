---
layout: default
title: Testing
nav_order: 9
---

# Test plan

The deployment tests answer one question after every change: **does the live server serve what this release says it serves?** They run against `https://tx.hl7europe.eu/r4` from outside, through Caddy, the way an IG publisher or validator reaches it.

Results are on the [Releases](releases/) page: per release, then per suite, then per test case and step.

## What is tested

| Suite | File | Checks |
|---|---|---|
| Server | `server.feature` | The capability statement names the FHIRsmith version pinned in `server/docker-compose.yml`, and the terminology capabilities are served. |
| Content, one suite per package or group of sources | `<package>.feature` | For each source in `library.yml`: a code from it is found (`$lookup`, `$validate-code`), in the version `library.yml` names; for value sets, `$validate-code` and `$expand` with that version. |
| Coverage | (the runner) | Every active line of `library.yml` is tagged on some feature (`@library:<line>`). A line without a test makes the run *incomplete*. |

What isn't tested here: the HL7 terminology test set (the server's own conformance, which FHIRsmith runs upstream), the `/r5` endpoint, and performance.

## When the tests run

| Trigger | Recorded as |
|---|---|
| A release is published | that release |
| *Run workflow* on Actions → Deployment tests, with a release tag | another run of that release |
| *Run workflow* without a tag, or the weekly schedule (Monday 05:00 UTC) | a check between releases |

## How they run

The tests are Gherkin, in the [OpenTestBed](https://github.com/OpenTestBed) language with its `fhir-terminology` dialect:

```gherkin
Scenario: ehdsi-vs-validate A code is valid in an eHDSI value set of the package version
  When Client validates a code on TxServer with:
    """
    { "resourceType": "Parameters", "parameter": [
        { "name": "url", "valueUri": "http://terminology.ehdsi.eu/ValueSet/eHDSIAllergyCertainty" },
        { "name": "valueSetVersion", "valueString": "0.2.0" },
        { "name": "system", "valueUri": "http://terminology.hl7.org/CodeSystem/allergyintolerance-verification" },
        { "name": "code", "valueCode": "unconfirmed" } ] }
    """
  Then $response.status should be 200
  And $response should satisfy "parameter.where(name = 'result').value = true"
```

The [Deployment tests workflow](https://github.com/hl7-eu/tx.hl7europe.eu/blob/master/.github/workflows/tests.yml) starts a throwaway [Interoperability Test Bed](https://interoperable-europe.ec.europa.eu/collection/itb) and the FHIR validator in Docker on the GitHub runner (`tests/itb/`). It compiles each feature to an ITB test suite, runs every test case against the live server, and stores the results on the `test-results` branch. The site is then rebuilt from them. The `should satisfy` assertions are FHIRPath, evaluated by the validator.

Operations available (the `fhir-terminology` dialect):

| Sentence | Request |
|---|---|
| `Client looks up a code on TxServer with:` | `POST /CodeSystem/$lookup` |
| `Client validates a code on TxServer with:` | `POST /ValueSet/$validate-code` |
| `Client validates a code against the code system on TxServer with:` | `POST /CodeSystem/$validate-code` |
| `Client expands on TxServer with:` | `POST /ValueSet/$expand` |
| `Client translates on TxServer with:` | `POST /ConceptMap/$translate` |
| `Client tests subsumption on TxServer with:` | `POST /CodeSystem/$subsumes` |
| `Client reads the capability statement of TxServer as $caps` | `GET /metadata` |
| `Client reads the terminology capabilities of TxServer as $caps` | `GET /metadata?mode=terminology` |

Then `$response.status should be 200`, and `$response should satisfy "<FHIRPath>"` on the response.

## Running the tests on your machine

You need Docker, Node 20 or later, and checkouts of [itb-cli](https://github.com/OpenTestBed/itb-cli) and [itb-plugin-authoring](https://github.com/OpenTestBed/itb-plugin-authoring) side by side (run `npm ci` in `itb-cli`).

```bash
eval "$(tests/itb/bootstrap.sh | tail -1)" && export ITB_COMMUNITY_KEY   # ITB on :10003 + validator
node tests/itb/run.mjs --itb-cli ../itb-cli                            # results in tests/out/
docker compose -p tx-tests -f tests/itb/docker-compose.yml down -v     # remove the test bed
```

Add `--server <url>` to test another server, for example a staging instance. To try one feature while writing it, compile it first: `node ../itb-cli/bin/itb-suite.mjs compile tests/features/<file>.feature`.

## Reading a failure

A failed test case shows its steps on the run page, with the failed step marked, plus the scenario (the request that was sent) and the ITB session log. The report says *which* check failed, not what the server answered. To see the answer, send the scenario's request yourself, for example with `curl -X POST https://tx.hl7europe.eu/r4/CodeSystem/$lookup -H "Content-Type: application/fhir+json" -d '<the Parameters>'`. Before treating a failure as a server defect, check that the test still matches `library.yml` (version, codes) and that the server had finished loading.
