[View code on GitHub](https://github.com/convergence-rfq/convergence-program-library/risk-engine/program/src/price_extractor.rs)

The `extract_prices` function in this code extracts prices for a list of base assets from a list of accounts. It takes in a vector of `BaseAssetInfo` structs, a mutable slice of `AccountInfo` structs, and a `Config` struct as arguments. It returns a `HashMap` that maps `BaseAssetIndex` values to `f64` prices.

The function first initializes an empty `HashMap` to store the extracted prices. It then enters a loop that continues until the `HashMap` has a price for each base asset. Within the loop, it checks that there are still accounts left to extract prices from. If there are no more accounts, it returns an error.

The function then takes the first account from the list of accounts and removes it from the slice. It filters the list of base assets to find those that reference the same oracle as the current account. It then extracts the price for the first matched base asset using the `extract_price` function and inserts it into the `HashMap`. Finally, it inserts the same price for all other matched base assets.

The `does_oracle_match` function is a helper function that checks whether a given base asset's price oracle matches a given address. It takes in a `BaseAssetInfo` struct and a `Pubkey` address as arguments and returns a boolean.

The `extract_price` function is another helper function that extracts the price for a given oracle and account. It takes in a `PriceOracle` enum, an `AccountInfo` struct, and a `Config` struct as arguments. It returns an `f64` price.

The `extract_switchboard_price` function is a helper function that extracts the price for a Switchboard oracle and account. It takes in an `AccountInfo` struct and a `Config` struct as arguments. It returns an `f64` price.

Overall, this code is used to extract prices for a list of base assets from a list of accounts. It does this by filtering the list of base assets to find those that reference the same oracle as the current account, and then extracting the price for the first matched base asset using the `extract_price` function. This code is likely used in the larger project to provide price data for other functions or modules.
## Questions: 
 1. What is the purpose of this code?
   - This code is a function called `extract_prices` that takes in a vector of `BaseAssetInfo`, a mutable reference to a slice of `AccountInfo`, and a `Config` struct, and returns a `HashMap` of `BaseAssetIndex` and `f64` values representing the prices of each base asset.
2. What external dependencies does this code have?
   - This code depends on several external crates: `std::collections`, `anchor_lang`, `rfq`, and `switchboard_v2`.
3. What is the role of the `does_oracle_match` function?
   - The `does_oracle_match` function is a helper function that takes in a `BaseAssetInfo` and a `Pubkey` address, and returns a boolean indicating whether the `PriceOracle` stored in the `BaseAssetInfo` matches the given address. This is used to filter the `base_assets` vector to find the correct oracle account for each base asset.