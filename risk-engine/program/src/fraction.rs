use std::ops::Neg;

#[derive(Debug, Clone, Copy)]
pub struct Fraction {
    mantissa: i128,
    decimals: u8,
}

impl Fraction {
    pub const fn new(mantissa: i128, decimals: u8) -> Self {
        Self { mantissa, decimals }
    }

    pub fn abs(self) -> Self {
        Self::new(self.mantissa.abs(), self.decimals)
    }

    pub fn checked_mul(self, rhs: Self) -> Option<Self> {
        Some(Self {
            mantissa: self.mantissa.checked_mul(rhs.mantissa)?,
            decimals: self.decimals.checked_add(rhs.decimals)?,
        })
    }

    pub fn checked_add(self, rhs: Self) -> Option<Self> {
        let max_decimals = u8::max(self.decimals, rhs.decimals);
        let (lhs, rhs) = (
            self.round_to_decimals(max_decimals)?,
            rhs.round_to_decimals(max_decimals)?,
        );

        Some(Fraction::new(lhs.mantissa + rhs.mantissa, lhs.decimals))
    }

    pub fn checked_sub(self, rhs: Self) -> Option<Self> {
        self.checked_add(-rhs)
    }

    pub fn to_i128_with_decimals(self, decimals: u8) -> Option<i128> {
        self.round_to_decimals(decimals).map(|x| x.mantissa)
    }

    pub fn round_to_decimals(self, decimals: u8) -> Option<Self> {
        if decimals == self.decimals {
            Some(self)
        } else if decimals < self.decimals {
            let difference = (self.decimals - decimals) as u32;
            Some(Fraction::new(
                self.mantissa / 10_i128.pow(difference),
                decimals,
            ))
        } else {
            let difference = (decimals - self.decimals) as u32;
            Some(Fraction::new(
                self.mantissa
                    .checked_mul(10_i128.checked_pow(difference)?)?,
                decimals,
            ))
        }
    }
}

impl<T> From<T> for Fraction
where
    T: Into<i128>,
{
    fn from(value: T) -> Self {
        Fraction::new(value.into(), 0)
    }
}

impl Neg for Fraction {
    type Output = Self;

    fn neg(self) -> Self::Output {
        Self::new(-self.mantissa, self.decimals)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn round_to_decimals_up() {
        let rounded = Fraction::new(12345, 3).round_to_decimals(5).unwrap();
        assert_eq!(rounded.mantissa, 1234500);
        assert_eq!(rounded.decimals, 5);
    }

    #[test]
    fn round_to_decimals_down() {
        let rounded = Fraction::new(12345, 3).round_to_decimals(1).unwrap();
        assert_eq!(rounded.mantissa, 123);
        assert_eq!(rounded.decimals, 1);
    }

    #[test]
    fn round_to_decimals_overflow() {
        let rounded = Fraction::new(12345, 3).round_to_decimals(200);
        assert!(rounded.is_none());
    }

    #[test]
    fn checked_add_with_less_decimals() {
        let lhs = Fraction::new(1, 3);
        let rhs = Fraction::new(22, 1);
        let result = lhs.checked_add(rhs).unwrap();
        assert_eq!(result.mantissa, 2201);
        assert_eq!(result.decimals, 3);
    }

    #[test]
    fn checked_add_with_more_decimals() {
        let lhs = Fraction::new(2, 1);
        let rhs = Fraction::new(555, 3);
        let result = lhs.checked_add(rhs).unwrap();
        assert_eq!(result.mantissa, 755);
        assert_eq!(result.decimals, 3);
    }
}
