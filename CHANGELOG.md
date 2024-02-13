# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

**Note:** Version 0 of Semantic Versioning is handled differently from version 1 and above.
The minor version will be incremented upon a breaking change and the patch version will be incremented for features.

## [3.0.1-dev] - 2023-09-05

### Fixes

- all: Added HXRO print trade provider and instrument for futures. See PR ([#163](https://github.com/convergence-rfq/convergence-program-library/pull/163)) for full details.

## [2.2.14] - 2023-10-31

### Features

- response: added response expiration timestamp field to Response state and validation to check response expiration. See PR ([#170](https://github.com/convergence-rfq/convergence-program-library/pull/170)) for full details.

## [2.2.13] - 2023-10-04

### Fixes

- psyoptions-american: Refactored PsyOptions American instrument to handle call and put logic. See PR ([#166](https://github.com/convergence-rfq/convergence-program-library/pull/166)) for full details.
    
## [2.2.12] - 2023-08-17

### Fixes

- all: Updated Solana libraries and Anchor version. See PR ([#157](https://github.com/convergence-rfq/convergence-program-library/pull/157)) for full details.
- solita: Update Solita NPM package version to 0.16.0

## [2.2.11] - 2023-07-17

### Fixes

- risk-engine: Fix risk engine failing in some cases and add min risk value logic. See PR ([#154](https://github.com/convergence-rfq/convergence-program-library/pull/154)) for full details.

## [2.2.10] - 2023-07-13

### Breaking

- all: Updated program ids. See PR ([#152](https://github.com/convergence-rfq/convergence-program-library/pull/152)) for full details.

## [2.2.9] - 2023-07-12

### Fixes

- rfq: Increment confirmed responses on RFQ confirmation. See PR ([#149](https://github.com/convergence-rfq/convergence-program-library/pull/149)) for full details.

## [2.2.8] - 2023-07-06

### Breaking

- rfq: Separate one side enum to leg side and quote side. See PR ([#139](https://github.com/convergence-rfq/convergence-program-library/pull/146)) for full details.

## [2.2.7] - 2023-06-13

### Fixes

- rfq: RFQ recent blockhash window has been extended. See PR ([#142](https://github.com/convergence-rfq/convergence-program-library/pull/142)) for full details.

## [2.2.6] - 2023-05-30

### Breaking

- rfq: Extended base assets by adding support for Pyth oracles and fixed prices for assets without an oracle. Added reserved space for base assets and base mints. Instruction `add_base_asset and change_base_asset_parameters` has been updated to include new properties. See PR ([#139](https://github.com/convergence-rfq/convergence-program-library/pull/139)) for full details.

### Features

- solita: Updated Solita packages to 2.2.6 ([#140](https://github.com/convergence-rfq/convergence-program-library/pull/140))

## [2.2.2-rc.3] - 2023-04-06

### Breaking

- rfq: Consolidated `set_base_asset_enabled_status` instruction into `change_base_asset_parameters` allowing for more control over working with base assets including `risk_category` and `price_oracle` ([#127](https://github.com/convergence-rfq/convergence-program-library/pull/127))

## [2.2.2-rc.2] - 2023-03-21

### Features

- risk-engine: Improved logging ([#122](https://github.com/convergence-rfq/convergence-program-library/pull/122))

### Breaking

- all: Updated Switchboard fixtures ([#123](https://github.com/convergence-rfq/convergence-program-library/pull/123))
- all: Updated Switchboard dependencies ([#121](https://github.com/convergence-rfq/convergence-program-library/pull/121))
- all: Updated JS dependencies ([#120](https://github.com/convergence-rfq/convergence-program-library/pull/120))

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
