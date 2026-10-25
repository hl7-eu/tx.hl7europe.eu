@library:internal:lang @library:internal:country @library:internal:currency @library:internal:mimetypes @library:ucum:data/terminology-cache/ucum-essence-2.2.xml @library:loinc:loinc-2.81-b.db @library:unii:unii_20240622.db
Feature: Built-in and file-based code systems are served
  The internal code systems and the cache files listed in library.yml (UCUM,
  LOINC, UNII). Where the file carries a version, the test checks it.

  Background:
    Given TxServer is the system under test at "https://tx.hl7europe.eu/r4"
    And FHIRValidator is a fhir-validator at "http://fhir-validator:8080"
    And Client is infrastructure

  Scenario: internal-lang BCP 47 language codes are served
    When Client validates a code against the code system on TxServer with:
      """
      { "resourceType": "Parameters", "parameter": [
          { "name": "url", "valueUri": "urn:ietf:bcp:47" },
          { "name": "code", "valueCode": "pt-PT" } ] }
      """
    Then $response.status should be 200
    And $response should satisfy "parameter.where(name = 'result').value = true"

  Scenario: internal-country ISO 3166 country codes are served
    When Client validates a code against the code system on TxServer with:
      """
      { "resourceType": "Parameters", "parameter": [
          { "name": "url", "valueUri": "urn:iso:std:iso:3166" },
          { "name": "code", "valueCode": "BE" } ] }
      """
    Then $response.status should be 200
    And $response should satisfy "parameter.where(name = 'result').value = true"

  Scenario: internal-currency ISO 4217 currency codes are served
    When Client validates a code against the code system on TxServer with:
      """
      { "resourceType": "Parameters", "parameter": [
          { "name": "url", "valueUri": "urn:iso:std:iso:4217" },
          { "name": "code", "valueCode": "EUR" } ] }
      """
    Then $response.status should be 200
    And $response should satisfy "parameter.where(name = 'result').value = true"

  Scenario: internal-mimetypes MIME types are served
    When Client validates a code against the code system on TxServer with:
      """
      { "resourceType": "Parameters", "parameter": [
          { "name": "url", "valueUri": "urn:ietf:bcp:13" },
          { "name": "code", "valueCode": "application/fhir+json" } ] }
      """
    Then $response.status should be 200
    And $response should satisfy "parameter.where(name = 'result').value = true"

  Scenario: ucum UCUM 2.2 is served
    When Client validates a code against the code system on TxServer with:
      """
      { "resourceType": "Parameters", "parameter": [
          { "name": "url", "valueUri": "http://unitsofmeasure.org" },
          { "name": "code", "valueCode": "mg/dL" } ] }
      """
    Then $response.status should be 200
    And $response should satisfy "parameter.where(name = 'result').value = true and parameter.where(name = 'version').value = '2.2'"

  Scenario: loinc LOINC 2.81 is served
    When Client looks up a code on TxServer with:
      """
      { "resourceType": "Parameters", "parameter": [
          { "name": "system", "valueUri": "http://loinc.org" },
          { "name": "code", "valueCode": "8867-4" } ] }
      """
    Then $response.status should be 200
    And $response should satisfy "parameter.where(name = 'version').value = '2.81' and parameter.where(name = 'display').value = 'Heart rate'"

  Scenario: unii UNII of 2024-06-22 is served
    When Client looks up a code on TxServer with:
      """
      { "resourceType": "Parameters", "parameter": [
          { "name": "system", "valueUri": "http://fdasis.nlm.nih.gov" },
          { "name": "code", "valueCode": "362O9ITL9D" } ] }
      """
    Then $response.status should be 200
    And $response should satisfy "parameter.where(name = 'version').value = '2024-06-22'"
