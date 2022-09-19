use anchor_lang::{AnchorSerialize, AnchorDeserialize};

// dex related data types

#[repr(C)]
#[derive(AnchorSerialize, AnchorDeserialize, PartialEq, Debug, Clone)]
pub enum Side {
    Bid,
    Ask,
}

impl Side {
    pub fn to_dex_side(&self) -> dex_cpi::typedefs::Side {
        match self {
            Self::Ask => dex_cpi::typedefs::Side::Ask,
            Self::Bid => dex_cpi::typedefs::Side::Bid,
        }
    }
}

#[repr(C)]
#[derive(AnchorSerialize, AnchorDeserialize, PartialEq, Debug, Clone)]
pub struct Fractional {
    pub m: i64,
    pub exp: u64,
}

impl Fractional {
    pub fn to_dex_fractional(&self) -> dex_cpi::typedefs::Fractional {
        dex_cpi::typedefs::Fractional {
            m: self.m,
            exp: self.exp,
        }
    }
}
