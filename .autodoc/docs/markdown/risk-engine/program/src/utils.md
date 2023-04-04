[View code on GitHub](https://github.com/convergence-rfq/convergence-program-library/risk-engine/program/src/utils.rs)

The code above provides three functions that are used in the Convergence Program Library project. The first function, `get_leg_amount_f64`, takes a reference to a `Leg` object and returns the amount of the instrument in the leg as a `f64` value. The `Leg` object is defined in the `state` module of the `rfq` crate, which is imported at the beginning of the code. The function first calls the `convert_fixed_point_to_f64` function to convert the instrument amount from a fixed-point representation to a `f64` value. If the `Leg` object's `side` field is `Side::Bid`, the result is negated. The function then returns the result.

The second function, `convert_fixed_point_to_f64`, takes a `u64` value and a `u8` value representing the number of decimal places and returns a `f64` value. This function is used in the `get_leg_amount_f64` function to convert the instrument amount from a fixed-point representation to a `f64` value.

The third function, `strict_f64_to_u64`, takes a `f64` value and returns an `Option<u64>` value. If the fractional component of the `f64` value is 0 and the value can be represented as an integer in the `u64` range, the function returns `Some` with the integer value. Otherwise, it returns `None`. This function may be used in other parts of the Convergence Program Library project to ensure that a `f64` value can be safely converted to a `u64` value without losing precision.

Overall, these functions provide utility functions for converting between different numeric representations and for extracting information from `Leg` objects. They may be used in various parts of the Convergence Program Library project to perform calculations and manipulate data. Here is an example usage of the `get_leg_amount_f64` function:

```
use rfq::state::{Leg, Side};

let leg = Leg {
    instrument_amount: 100000000,
    instrument_decimals: 8,
    side: Side::Ask,
};

let amount = get_leg_amount_f64(&leg);
assert_eq!(amount, 1.0);
```
## Questions: 
 1. What is the purpose of the `Convergence Program Library` and how does this code fit into the overall project?
- This question cannot be answered based on the given code alone. More information about the project and its goals is needed.

2. What is the expected input for the `leg` parameter in the `get_leg_amount_f64` function?
- The `leg` parameter is expected to be of type `Leg`, which is likely defined in the `rfq::state` module. More information about the `Leg` struct and its properties is needed to fully understand the expected input.

3. What is the purpose of the `strict_f64_to_u64` function and when would it be used?
- The `strict_f64_to_u64` function converts a `f64` value to an `Option<u64>` value, returning `None` if the input value has a non-zero fractional component or cannot be represented as an integer in the `u64` type. It would be used in cases where a `u64` value is needed but the input value may have a fractional component that needs to be checked.