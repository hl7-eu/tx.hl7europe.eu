@library:npm:hl7.terminology.r4 @library:npm:fhir.tx.support.r4 @library:npm:ihe.formatcode.fhir @library:npm:fhir.dicom
Feature: Unversioned support packages are served
  library.yml lists these packages without a version, so the server loads the
  current one at start-up. The tests check the content is there, not which
  version it is.

  Background:
    Given TxServer is the system under test at "https://tx.hl7europe.eu/r4"
    And FHIRValidator is a fhir-validator at "http://fhir-validator:8080"
    And Client is infrastructure

  @package:hl7.terminology.r4
  Scenario: tho-vs-validate A code is valid in a THO value set
    When Client validates a code on TxServer with:
      """
      { "resourceType": "Parameters", "parameter": [
          { "name": "url", "valueUri": "http://terminology.hl7.org/ValueSet/v3-NullFlavor" },
          { "name": "system", "valueUri": "http://terminology.hl7.org/CodeSystem/v3-NullFlavor" },
          { "name": "code", "valueCode": "UNK" } ] }
      """
    Then $response.status should be 200
    And $response should satisfy "parameter.where(name = 'result').value = true"

  @package:fhir.tx.support.r4
  Scenario: tx-support-cs-lookup The tx.support designation-usage code system is served
    When Client looks up a code on TxServer with:
      """
      { "resourceType": "Parameters", "parameter": [
          { "name": "system", "valueUri": "http://fhir.org/packages/fhir.tx.support/CodeSystem/designation-usage" },
          { "name": "code", "valueCode": "display" } ] }
      """
    Then $response.status should be 200
    And $response should satisfy "parameter.where(name = 'display').value = 'Display'"

  @package:ihe.formatcode.fhir
  Scenario: formatcode-vs-validate A code is valid in the IHE format code value set
    When Client validates a code on TxServer with:
      """
      { "resourceType": "Parameters", "parameter": [
          { "name": "url", "valueUri": "http://ihe.net/fhir/ihe.formatcode.fhir/ValueSet/formatcode" },
          { "name": "system", "valueUri": "http://ihe.net/fhir/ihe.formatcode.fhir/CodeSystem/formatcode" },
          { "name": "code", "valueCode": "urn:ihe:pcc" } ] }
      """
    Then $response.status should be 200
    And $response should satisfy "parameter.where(name = 'result').value = true"

  # The package version is named: the server also holds a DCM code system of
  # version 01, which it uses when no version is given, and ANN is not in it.
  # This test needs updating when a new fhir.dicom version is loaded (#14).
  @package:fhir.dicom
  Scenario: dicom-cs-lookup The DICOM code system from fhir.dicom is served
    When Client looks up a code on TxServer with:
      """
      { "resourceType": "Parameters", "parameter": [
          { "name": "system", "valueUri": "http://dicom.nema.org/resources/ontology/DCM" },
          { "name": "version", "valueString": "2025.3.20250714" },
          { "name": "code", "valueCode": "ANN" } ] }
      """
    Then $response.status should be 200
    And $response should satisfy "parameter.where(name = 'display').value = 'Annotation'"
