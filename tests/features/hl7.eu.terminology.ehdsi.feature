@library:npm:hl7.eu.terminology.ehdsi#0.2.0
Feature: Package hl7.eu.terminology.ehdsi#0.2.0 is served
  library.yml lists npm:hl7.eu.terminology.ehdsi#0.2.0. After deployment the
  server must answer from that package version: a code system it defines, a
  value set it defines, and the expansion of that value set.

  Background:
    Given TxServer is the system under test at "https://tx.hl7europe.eu/r4"
    And FHIRValidator is a fhir-validator at "http://fhir-validator:8080"
    And Client is infrastructure

  Scenario: ehdsi-cs-lookup The eHDSI EDQM code system is the package version
    When Client looks up a code on TxServer with:
      """
      { "resourceType": "Parameters", "parameter": [
          { "name": "system", "valueUri": "http://hl7europe.org/fhir/terminology/ehdsi/CodeSystem/edqm-all" },
          { "name": "version", "valueString": "0.2.0" },
          { "name": "code", "valueCode": "domain" } ] }
      """
    Then $response.status should be 200
    And $response should satisfy "parameter.where(name = 'display').value = 'Domain'"

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

  Scenario: ehdsi-vs-expand The eHDSI value set expands to the package version
    When Client expands on TxServer with:
      """
      { "resourceType": "Parameters", "parameter": [
          { "name": "url", "valueUri": "http://terminology.ehdsi.eu/ValueSet/eHDSIAllergyCertainty" },
          { "name": "valueSetVersion", "valueString": "0.2.0" } ] }
      """
    Then $response.status should be 200
    And $response should satisfy "version = '0.2.0' and expansion.contains.where(code = 'unconfirmed').exists()"
