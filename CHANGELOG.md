# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

**Note:** Version 0 of Semantic Versioning is handled differently from version 1 and above.
The minor version will be incremented upon a breaking change and the patch version will be incremented for features.

## [2.2.2-rc.2] - 2023-03-21

### Breaking

- all: Updated Switchboard dependencies

## [2.2.2-rc.1] - 2023-03-07

### Breaking

- all: Updated program ids

## [2.2.2-rc] - 2023-03-03

### Features

- rfq: RFQs can now be canceled after responses have been settled ([#117](https://github.com/convergence-rfq/convergence-program-library/pull/117))

### Breaking

- psyoptions-american-instrument: Instrument now saves mint decimal information ([#116](https://github.com/convergence-rfq/convergence-program-library/pull/116))
- psyoptions-european-instrument: Instrument now saves mint decimal information ([#116](https://github.com/convergence-rfq/convergence-program-library/pull/116))

## [2.2.1] - 2023-02-21

### Features

- risk-engine: Oracle parameters `accepted_oracle_staleness` and `accepted_oracle_confidence_interval_portion` are now saved in storage ([#113](https://github.com/convergence-rfq/convergence-program-library/pull/113))

### Fixes

- tests: Improved test speed

## [2.2.0] - 2023-02-17

### Features

- rfq: Add ability to enable or disable protocol, base assets and instruments ([#111](https://github.com/convergence-rfq/convergence-program-library/pull/111))
- rfq: Add protocol fee mechanism ([#110](https://github.com/convergence-rfq/convergence-program-library/pull/110))

### Fixes

- all: Bump bumpalo version from 3.11.0 to 3.12.0 ([#106](https://github.com/convergence-rfq/convergence-program-library/pull/106))

### Breaking

- rfq: Rework RFQ and response accounts to PDAs ([#97](https://github.com/convergence-rfq/convergence-program-library/pull/97))
