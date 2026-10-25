---
layout: default
title: Home
nav_order: 1
---


The HL7 EU Terminology server, hosted at [https://tx.hl7europe.eu](https://tx.hl7europe.eu), is used for authoring and validating FHIR specifications. 

Please note:
> **The FHIR Tooling eco-system exists to support design time and publication usage. It is not intended to support production use, and should not be used in operational systems.**

This documentation describes the server setup and tooling 

There is a [roadmap for terminology content](https://github.com/orgs/hl7-eu/projects/7/views/8) and an [issue page](https://github.com/hl7-eu/tx.hl7europe.eu/issues) where terminology content changes can be requested. Each edition of the server is a [release](releases/), with its release notes and test results.


This documentation is hosted in the [github repository](https://github.com/hl7-eu/tx.hl7europe.eu), in the [docs folder](https://github.com/hl7-eu/tx.hl7europe.eu/tree/master/docs).


## How a change reaches the server

See [Requesting a change](requesting-changes.html) for what to put in an issue and what happens to it.

@startuml
skinparam shadowing false
skinparam defaultFontName Arial
skinparam ActivityBackgroundColor #FFFFFF
skinparam ActivityBorderColor #1F5B99
skinparam ArrowColor #1F5B99
skinparam SwimlaneTitleFontStyle bold
|Requester|
|Maintainers|
|Terminology maintainers|
|Automated tests|
|Requester|
start
split
  :Ask for a content change
  or report a problem;
split again
  |Maintainers|
  :Propose a platform
  upgrade or fix;
end split
|Maintainers|
:Discuss the request;
if (Platform change or problem?) then (yes)
  :Decide;
else (no: content)
  |Terminology maintainers|
  :Check the request, or prepare
  the change and publish
  the content;
  |Maintainers|
endif
:Take in the change
when ready and wanted;
:Update the test plan;
:Release a new edition
with release notes;
:Put the edition
on the server;
|Automated tests|
:Test the live server;
:Publish the results
with the release;
stop
@enduml

This documentation describes:

* [Server setup](server/)
* [Releases](releases/)
* [Content](content/)
* [Requesting a change](requesting-changes.html)
* [Usage](using-server.html)
* [Testing](testing.html)
