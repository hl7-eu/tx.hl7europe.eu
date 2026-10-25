@server
Feature: The R5 endpoint serves the same server and content
  The server answers at /r5 as well as /r4 (Caddyfile, config.json). The same
  FHIRsmith release must answer there as FHIR 5.0.0, with the library content.

  Background:
    Given TxServer is the system under test at "https://tx.hl7europe.eu/r5"
    And FHIRValidator is a fhir-validator at "http://fhir-validator:8080"
    And Client is infrastructure

  Scenario: r5-server-software The R5 capability statement names the deployed FHIRsmith release
    When Client reads the capability statement of TxServer as $caps
    Then $response.status should be 200
    And $caps should satisfy "software.name = 'FHIRsmith' and software.version = '0.18.0' and fhirVersion = '5.0.0'"

  Scenario: r5-loinc LOINC is served at the R5 endpoint
    When Client looks up a code on TxServer with:
      """
      { "resourceType": "Parameters", "parameter": [
          { "name": "system", "valueUri": "http://loinc.org" },
          { "name": "code", "valueCode": "8867-4" } ] }
      """
    Then $response.status should be 200
    And $response should satisfy "parameter.where(name = 'version').value = '2.81'"

  Scenario: r5-ehdsi-vs-validate An eHDSI value set is served at the R5 endpoint
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
