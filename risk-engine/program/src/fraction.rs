#[derive(Debug, Clone)]
pub struct Fraction {
    mantissa: i128,
    decimals: u8,
}

impl Fraction {
    pub const fn new(mantissa: i128, decimals: u8) -> Self {
        Self { mantissa, decimals }
    }

    pub fn checked_mul(&self, rhs: Self) -> Option<Self> {
        Some(Self {
            mantissa: self.mantissa.checked_mul(rhs.mantissa)?,
            decimals: self.decimals.checked_add(rhs.decimals)?,
        })
    }

    pub fn checked_into_u64(&self) -> Option<u64> {
        u64::try_from(self.round()).ok()
    }

    pub fn checked_into_i64(&self) -> Option<i64> {
        i64::try_from(self.round()).ok()
    }

    fn round(&self) -> i128 {
        self.mantissa / 10_i128.pow(self.decimals as u32)
    }
}

impl<T> From<T> for Fraction
where
    T: Into<i128>,
{
    fn from(value: T) -> Self {
        Fraction::new(value.into(), 1)
    }
}
