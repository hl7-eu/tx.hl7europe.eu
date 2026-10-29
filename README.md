# tx.hl7europe.eu

The HL7 Europe FHIR terminology server, used to author and validate FHIR specifications.

> The FHIR tooling ecosystem supports design time and publication. This server is not for production use and should not be used in operational systems.

## The server

| | |
|---|---|
| FHIR R4 | <https://tx.hl7europe.eu/r4> |
| FHIR R5 | <https://tx.hl7europe.eu/r5> |
| In a browser | <https://tx.hl7europe.eu> |

To use it from the IG Publisher or the FHIR validator, pass `-tx https://tx.hl7europe.eu/r4`. See [Usage](https://hl7-eu.github.io/tx.hl7europe.eu/using-server.html).

## Documentation

Full documentation: <https://hl7-eu.github.io/tx.hl7europe.eu/>

- [Releases](https://hl7-eu.github.io/tx.hl7europe.eu/releases/): each edition of the server, with its release notes and test results
- [Test plan](https://hl7-eu.github.io/tx.hl7europe.eu/test-plan/): what the deployment tests check
- [Content](https://hl7-eu.github.io/tx.hl7europe.eu/content/): what the server holds, and how content is added or updated
- [Server setup](https://hl7-eu.github.io/tx.hl7europe.eu/server/): how the server is deployed and updated
- [Testing](https://hl7-eu.github.io/tx.hl7europe.eu/testing.html): how the tests run, in the European Commission's [Interoperability Test Bed](https://www.itb.ec.europa.eu/)

## Requesting a change

[Open an issue](https://github.com/hl7-eu/tx.hl7europe.eu/issues/new) to ask for new or updated content, or to report a problem or request a change in this server, its documentation, or the ecosystem. [Requesting a change](https://hl7-eu.github.io/tx.hl7europe.eu/requesting-changes.html) says what to put in the issue and what happens to it. The [issue list](https://github.com/hl7-eu/tx.hl7europe.eu/issues) shows the open requests and problems. The [terminology roadmap](https://github.com/orgs/hl7-eu/projects/7/views/8) shows the planned content.

## Content from HL7 Europe

These HL7 Europe repositories publish the packages that the server loads:

| Package | Repository |
|---|---|
| `hl7.eu.terminology.common` | [hl7-eu/hl7.eu.terminology.common](https://github.com/hl7-eu/hl7.eu.terminology.common) |
| `hl7.eu.terminology.ehdsi` | [hl7-eu/EHDSI-Terminology-package](https://github.com/hl7-eu/EHDSI-Terminology-package) |

The server also loads international content: HL7 Terminology (THO), the IPS, IHE FormatCode, DICOM, UCUM, LOINC and UNII. [`server/config/library.yml`](server/config/library.yml) lists every source and its version.

## This repository

| Folder | Holds |
|---|---|
| [`server/`](server/) | The server: Docker Compose file, Caddy configuration, and the content list (`config/library.yml`) |
| [`tests/`](tests/) | The deployment tests (`features/`), the ITB runner (`itb/`), and the generator for the Releases and Test plan pages (`site/`) |
| [`docs/`](docs/) | The documentation site |
| [`.github/workflows/`](.github/workflows/) | The deployment tests and the site build |
