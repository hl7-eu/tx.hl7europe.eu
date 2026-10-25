@library:npm:hl7.fhir.uv.ips#2.0.0 @library:npm:hl7.fhir.uv.ips#1.1.0
Feature: Packages hl7.fhir.uv.ips#2.0.0 and #1.1.0 are both served
  library.yml lists two IPS versions side by side. Each must answer for its own
  version of the IPS value sets and code systems.

  Background:
    Given TxServer is the system under test at "https://tx.hl7europe.eu/r4"
    And FHIRValidator is a fhir-validator at "http://fhir-validator:8080"
    And Client is infrastructure

  Scenario: ips-2-vs-validate A code is valid in an IPS 2.0.0 value set
    When Client validates a code on TxServer with:
      """
      { "resourceType": "Parameters", "parameter": [
          { "name": "url", "valueUri": "http://hl7.org/fhir/uv/ips/ValueSet/problem-type-loinc" },
          { "name": "valueSetVersion", "valueString": "2.0.0" },
          { "name": "system", "valueUri": "http://loinc.org" },
          { "name": "code", "valueCode": "75326-9" } ] }
      """
    Then $response.status should be 200
    And $response should satisfy "parameter.where(name = 'result').value = true"

  Scenario: ips-1-cs-lookup The IPS 1.1.0 absent-unknown code system is served
    When Client looks up a code on TxServer with:
      """
      { "resourceType": "Parameters", "parameter": [
          { "name": "system", "valueUri": "http://hl7.org/fhir/uv/ips/CodeSystem/absent-unknown-uv-ips" },
          { "name": "version", "valueString": "1.1.0" },
          { "name": "code", "valueCode": "no-allergy-info" } ] }
      """
    Then $response.status should be 200
    And $response should satisfy "parameter.where(name = 'version').value = '1.1.0'"

  Scenario: ips-1-vs-validate A code is valid in an IPS 1.1.0 value set
    When Client validates a code on TxServer with:
      """
      { "resourceType": "Parameters", "parameter": [
          { "name": "url", "valueUri": "http://hl7.org/fhir/uv/ips/ValueSet/absent-or-unknown-allergies-uv-ips" },
          { "name": "valueSetVersion", "valueString": "1.1.0" },
          { "name": "system", "valueUri": "http://hl7.org/fhir/uv/ips/CodeSystem/absent-unknown-uv-ips" },
          { "name": "code", "valueCode": "no-allergy-info" } ] }
      """
    Then $response.status should be 200
    And $response should satisfy "parameter.where(name = 'result').value = true"
