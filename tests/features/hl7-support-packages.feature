@library:npm:hl7.terminology.r4#7.4.0 @library:npm:fhir.tx.support.r4#0.38.0 @library:npm:ihe.formatcode.fhir#1.6.0 @library:npm:fhir.dicom#2025.3.20250714
Feature: Support packages are served in their pinned versions
  library.yml pins these packages. Each test names a resource version that the
  pinned package carries, so an older or newer package fails it.

  Background:
    Given TxServer is the system under test at "https://tx.hl7europe.eu/r4"
    And FHIRValidator is a fhir-validator at "http://fhir-validator:8080"
    And Client is infrastructure

  # THO resources carry their own versions: ActCode is 11.0.0 in THO 7.4.0.
  @package:hl7.terminology.r4
  Scenario: tho-cs-lookup ActCode from THO 7.4.0 is served
    When Client looks up a code on TxServer with:
      """
      { "resourceType": "Parameters", "parameter": [
          { "name": "system", "valueUri": "http://terminology.hl7.org/CodeSystem/v3-ActCode" },
          { "name": "version", "valueString": "11.0.0" },
          { "name": "code", "valueCode": "AMB" } ] }
      """
    Then $response.status should be 200
    And $response should satisfy "parameter.where(name = 'display').value = 'ambulatory'"

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

  # tx.support 0.38.0 carries CVX of 2025-07-15.
  @package:fhir.tx.support.r4
  Scenario: tx-support-cs-lookup CVX from tx.support 0.38.0 is served
    When Client looks up a code on TxServer with:
      """
      { "resourceType": "Parameters", "parameter": [
          { "name": "system", "valueUri": "http://hl7.org/fhir/sid/cvx" },
          { "name": "version", "valueString": "20250715" },
          { "name": "code", "valueCode": "207" } ] }
      """
    Then $response.status should be 200
    And $response should satisfy "parameter.where(name = 'version').value = '20250715'"

  @package:ihe.formatcode.fhir
  Scenario: formatcode-vs-validate A code is valid in the IHE format code value set 1.6.0
    When Client validates a code on TxServer with:
      """
      { "resourceType": "Parameters", "parameter": [
          { "name": "url", "valueUri": "http://ihe.net/fhir/ihe.formatcode.fhir/ValueSet/formatcode" },
          { "name": "valueSetVersion", "valueString": "1.6.0" },
          { "name": "system", "valueUri": "http://ihe.net/fhir/ihe.formatcode.fhir/CodeSystem/formatcode" },
          { "name": "code", "valueCode": "urn:ihe:pcc" } ] }
      """
    Then $response.status should be 200
    And $response should satisfy "parameter.where(name = 'result').value = true"

  # The package version is named: the server also holds a DCM code system of
  # version 01, which it uses when no version is given, and ANN is not in it.
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
