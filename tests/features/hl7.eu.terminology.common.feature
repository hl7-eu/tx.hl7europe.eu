@library:npm:hl7.eu.terminology.common#0.4.0
Feature: Package hl7.eu.terminology.common#0.4.0 is served
  library.yml lists npm:hl7.eu.terminology.common#0.4.0. After deployment the
  server must answer from that package version, not from an earlier one still
  in its cache.

  Background:
    Given TxServer is the system under test at "https://tx.hl7europe.eu/r4"
    And FHIRValidator is a fhir-validator at "http://fhir-validator:8080"
    And Client is infrastructure

  # The EDQM code system carries its own edition (^version in edqm.fsh), not
  # the package version; the value set below checks the package version.
  Scenario: eu-common-cs-lookup The EU EDQM code system of 2026-10-13 is served
    When Client looks up a code on TxServer with:
      """
      { "resourceType": "Parameters", "parameter": [
          { "name": "system", "valueUri": "http://hl7europe.org/fhir/terminology/common/CodeSystem/edqm" },
          { "name": "version", "valueString": "2026-10-13" },
          { "name": "code", "valueCode": "SOM" } ] }
      """
    Then $response.status should be 200
    And $response should satisfy "parameter.where(name = 'display').value = 'state of matter'"

  Scenario: eu-common-vs-validate A code is valid in an EU laboratory value set of the package version
    When Client validates a code on TxServer with:
      """
      { "resourceType": "Parameters", "parameter": [
          { "name": "url", "valueUri": "http://hl7europe.org/fhir/terminology/common/ValueSet/lab-reportType-eu-lab" },
          { "name": "valueSetVersion", "valueString": "0.4.0" },
          { "name": "system", "valueUri": "http://loinc.org" },
          { "name": "code", "valueCode": "11502-2" } ] }
      """
    Then $response.status should be 200
    And $response should satisfy "parameter.where(name = 'result').value = true"
