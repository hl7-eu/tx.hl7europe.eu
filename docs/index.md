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


@startuml
skinparam rectangle<<technology>> {
	roundCorner 25
}
skinparam rectangle<<application>> {
	roundCorner 25
}
skinparam rectangle<<business>> {
	roundCorner 25
}
sprite $techService jar:archimate/technology-service
sprite $appComponent jar:archimate/application-component
sprite $appProcess jar:archimate/application-process
sprite $businessProcess jar:archimate/business-process
sprite $techArtifact jar:archimate/technology-artifact


rectangle "GitHub Repository" as Repo <<$techService>><<technology>> #Technology
rectangle "Cloud VM" as Cloud <<$techService>><<technology>> #Technology
rectangle "Docker Container image" as Docker <<$techArtifact>><<technology>> #Technology
rectangle "FHIR Terminology Server" as TerminologyServer <<$appComponent>><<application>> #Application
rectangle "Content Creation Process" as CCP <<$businessProcess>><<business>> #Business
rectangle "Content Deployment Process" as CDP <<$businessProcess>><<business>> #Business
artifact "Server Content Update" as SCU <<$appProcess>> #Application
rectangle "Server Deployment Process" as SDP <<$businessProcess>><<business>> #Business
artifact "Content Packages" as ContentPackages <<$artifact>> #Application
artifact "Release Set" as ReleaseSet <<$artifact>> #Application
artifact "Terminology Cache files" as CacheFiles <<$artifact>> #Application
frame "Development Tools" as DevTools {
  rectangle "IG Builder" as IGBuilder <<$appComponent>><<application>> #Application
  rectangle "Resource Validation" as ResourceValidator <<$appComponent>><<application>> #Application
}
Repo -u-> Docker : "Source"
Cloud -down-> TerminologyServer : "Hosts"
SCU -down-> TerminologyServer 
CCP -d-> ContentPackages : "Produces"
ContentPackages -r-* ReleaseSet : "Part of"
CacheFiles -u-* ReleaseSet : "Part of" 
ReleaseSet -right-> SCU : "Loaded into"
DevTools -up-> TerminologyServer : "Uses"
SDP -d-> Cloud : "Deploys to"
SDP -d-> Docker : "Uses"
CCP -r[hidden]- CDP
CDP -r[hidden]- SDP

'SDP - Docker
CDP -d- SCU
ReleaseSet -u-CDP

@enduml

This document describes:

* [Server Setup]()
* [Content]()
* [Usage]()
* [Testing]()
