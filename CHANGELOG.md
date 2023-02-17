# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

**Note:** Version 0 of Semantic Versioning is handled differently from version 1 and above.
The minor version will be incremented upon a breaking change and the patch version will be incremented for features.

## [2.2.0] - 2023-02-17

### Features

- rfq: Add ability to enable or disable protocol, base assets and instruments ([#111](https://github.com/convergence-rfq/protocol-disable-instrument-and-base-asset))
- rfq: Add protocol fee mechanism ([#110](https://github.com/convergence-rfq/protocol-fees))

### Fixes

- all: Bump bumpalo version from 3.11.0 to 3.12.0 ([#106](https://github.com/convergence-rfq/dependabot/cargo/spot-instrument/program/bumpalo-3.12.0))

### Breaking

- rfq: Rework RFQ and response accounts to PDAs ([#97](https://gihub.com/convergence-rfq/rfq-and-response-to-pda))