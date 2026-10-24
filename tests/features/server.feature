@server
Feature: The server runs the expected FHIRsmith release
  The image tag in server/docker-compose.yml is the release the server must
  report. When the image is updated, update the version here in the same change.

  Background:
    Given TxServer is the system under test at "https://tx.hl7europe.eu/r4"
    And FHIRValidator is a fhir-validator at "http://fhir-validator:8080"
    And Client is infrastructure

  Scenario: server-software The capability statement names the deployed FHIRsmith release
    When Client reads the capability statement of TxServer as $caps
    Then $response.status should be 200
    And $caps should satisfy "software.name = 'FHIRsmith' and software.version = '0.18.0' and fhirVersion = '4.0.1'"

  Scenario: server-terminology-capabilities The terminology capabilities are served
    When Client reads the terminology capabilities of TxServer as $tcaps
    Then $response.status should be 200
    And $tcaps should satisfy "codeSystem.where(uri = 'http://loinc.org').exists()"
