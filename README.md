# Convergence Program Library

[![Run Tests](https://github.com/convergence-rfq/convergence-program-library/actions/workflows/tests.yml/badge.svg)](https://github.com/convergence-rfq/convergence-program-library/actions/workflows/tests.yml)
[![Solita NPM Publish](https://github.com/convergence-rfq/convergence-program-library/actions/workflows/solita-npm-publish.yml/badge.svg)](https://github.com/convergence-rfq/convergence-program-library/actions/workflows/solita-npm-publish.yml)

Convergence RFQ smart contracts and NPM SDK.

## Development

**Programs**

```bash
anchor build
```

**Tests**

For test speed up purposes, some test setup is done via loading a lot of pre-initialized accounts. The script `anchor run generate-test-fixtures` generates accounts, keypairs and public keys to names mapping and saves them to `tests/fixtures` folder. Also this scripts adds accounts to load to `Test.toml` files.

In case those pre-initialized accounts need to change, the scripts should be re-run to generate them once more.
