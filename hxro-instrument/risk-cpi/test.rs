#![feature(prelude_import)]
#[prelude_import]
use std::prelude::rust_2021::*;
#[macro_use]
extern crate std;
use anchor_lang::prelude::*;
pub mod typedefs {
    //! User-defined types.
    use super::*;
    pub enum OracleType {
        Uninitialized,
        Pyth,
        Dummy,
    }
    #[automatically_derived]
    impl ::core::marker::Copy for OracleType {}
    impl borsh::ser::BorshSerialize for OracleType {
        fn serialize<W: borsh::maybestd::io::Write>(
            &self,
            writer: &mut W,
        ) -> core::result::Result<(), borsh::maybestd::io::Error> {
            let variant_idx: u8 = match self {
                OracleType::Uninitialized => 0u8,
                OracleType::Pyth => 1u8,
                OracleType::Dummy => 2u8,
            };
            writer.write_all(&variant_idx.to_le_bytes())?;
            match self {
                OracleType::Uninitialized => {}
                OracleType::Pyth => {}
                OracleType::Dummy => {}
            }
            Ok(())
        }
    }
    impl borsh::de::BorshDeserialize for OracleType {
        fn deserialize(
            buf: &mut &[u8],
        ) -> core::result::Result<Self, borsh::maybestd::io::Error> {
            let variant_idx: u8 = borsh::BorshDeserialize::deserialize(buf)?;
            let return_value = match variant_idx {
                0u8 => OracleType::Uninitialized,
                1u8 => OracleType::Pyth,
                2u8 => OracleType::Dummy,
                _ => {
                    let msg = {
                        let res = ::alloc::fmt::format(
                            ::core::fmt::Arguments::new_v1(
                                &["Unexpected variant index: "],
                                &[::core::fmt::ArgumentV1::new_debug(&variant_idx)],
                            ),
                        );
                        res
                    };
                    return Err(
                        borsh::maybestd::io::Error::new(
                            borsh::maybestd::io::ErrorKind::InvalidInput,
                            msg,
                        ),
                    );
                }
            };
            Ok(return_value)
        }
    }
    #[automatically_derived]
    impl ::core::clone::Clone for OracleType {
        #[inline]
        fn clone(&self) -> OracleType {
            match self {
                OracleType::Uninitialized => OracleType::Uninitialized,
                OracleType::Pyth => OracleType::Pyth,
                OracleType::Dummy => OracleType::Dummy,
            }
        }
    }
    #[automatically_derived]
    impl ::core::fmt::Debug for OracleType {
        fn fmt(&self, f: &mut ::core::fmt::Formatter) -> ::core::fmt::Result {
            match self {
                OracleType::Uninitialized => {
                    ::core::fmt::Formatter::write_str(f, "Uninitialized")
                }
                OracleType::Pyth => ::core::fmt::Formatter::write_str(f, "Pyth"),
                OracleType::Dummy => ::core::fmt::Formatter::write_str(f, "Dummy"),
            }
        }
    }
    impl Default for OracleType {
        fn default() -> Self {
            Self::Uninitialized
        }
    }
    pub struct FastInt {
        pub value: i128,
    }
    #[automatically_derived]
    impl ::core::default::Default for FastInt {
        #[inline]
        fn default() -> FastInt {
            FastInt {
                value: ::core::default::Default::default(),
            }
        }
    }
    #[automatically_derived]
    impl ::core::fmt::Debug for FastInt {
        fn fmt(&self, f: &mut ::core::fmt::Formatter) -> ::core::fmt::Result {
            ::core::fmt::Formatter::debug_struct_field1_finish(
                f,
                "FastInt",
                "value",
                &&self.value,
            )
        }
    }
    #[automatically_derived]
    impl ::core::marker::Copy for FastInt {}
    impl borsh::ser::BorshSerialize for FastInt
    where
        i128: borsh::ser::BorshSerialize,
    {
        fn serialize<W: borsh::maybestd::io::Write>(
            &self,
            writer: &mut W,
        ) -> ::core::result::Result<(), borsh::maybestd::io::Error> {
            borsh::BorshSerialize::serialize(&self.value, writer)?;
            Ok(())
        }
    }
    impl borsh::de::BorshDeserialize for FastInt
    where
        i128: borsh::BorshDeserialize,
    {
        fn deserialize(
            buf: &mut &[u8],
        ) -> ::core::result::Result<Self, borsh::maybestd::io::Error> {
            Ok(Self {
                value: borsh::BorshDeserialize::deserialize(buf)?,
            })
        }
    }
    #[automatically_derived]
    impl ::core::clone::Clone for FastInt {
        #[inline]
        fn clone(&self) -> FastInt {
            FastInt {
                value: ::core::clone::Clone::clone(&self.value),
            }
        }
    }
    pub struct MarkPrice {
        pub product_key: Pubkey,
        pub mark_price: FastInt,
        pub prev_oracle_minus_book_ewma: FastInt,
        pub oracle_minus_book_ewma: FastInt,
    }
    #[automatically_derived]
    impl ::core::default::Default for MarkPrice {
        #[inline]
        fn default() -> MarkPrice {
            MarkPrice {
                product_key: ::core::default::Default::default(),
                mark_price: ::core::default::Default::default(),
                prev_oracle_minus_book_ewma: ::core::default::Default::default(),
                oracle_minus_book_ewma: ::core::default::Default::default(),
            }
        }
    }
    #[automatically_derived]
    impl ::core::fmt::Debug for MarkPrice {
        fn fmt(&self, f: &mut ::core::fmt::Formatter) -> ::core::fmt::Result {
            ::core::fmt::Formatter::debug_struct_field4_finish(
                f,
                "MarkPrice",
                "product_key",
                &&self.product_key,
                "mark_price",
                &&self.mark_price,
                "prev_oracle_minus_book_ewma",
                &&self.prev_oracle_minus_book_ewma,
                "oracle_minus_book_ewma",
                &&self.oracle_minus_book_ewma,
            )
        }
    }
    #[automatically_derived]
    impl ::core::marker::Copy for MarkPrice {}
    impl borsh::ser::BorshSerialize for MarkPrice
    where
        Pubkey: borsh::ser::BorshSerialize,
        FastInt: borsh::ser::BorshSerialize,
        FastInt: borsh::ser::BorshSerialize,
        FastInt: borsh::ser::BorshSerialize,
    {
        fn serialize<W: borsh::maybestd::io::Write>(
            &self,
            writer: &mut W,
        ) -> ::core::result::Result<(), borsh::maybestd::io::Error> {
            borsh::BorshSerialize::serialize(&self.product_key, writer)?;
            borsh::BorshSerialize::serialize(&self.mark_price, writer)?;
            borsh::BorshSerialize::serialize(&self.prev_oracle_minus_book_ewma, writer)?;
            borsh::BorshSerialize::serialize(&self.oracle_minus_book_ewma, writer)?;
            Ok(())
        }
    }
    impl borsh::de::BorshDeserialize for MarkPrice
    where
        Pubkey: borsh::BorshDeserialize,
        FastInt: borsh::BorshDeserialize,
        FastInt: borsh::BorshDeserialize,
        FastInt: borsh::BorshDeserialize,
    {
        fn deserialize(
            buf: &mut &[u8],
        ) -> ::core::result::Result<Self, borsh::maybestd::io::Error> {
            Ok(Self {
                product_key: borsh::BorshDeserialize::deserialize(buf)?,
                mark_price: borsh::BorshDeserialize::deserialize(buf)?,
                prev_oracle_minus_book_ewma: borsh::BorshDeserialize::deserialize(buf)?,
                oracle_minus_book_ewma: borsh::BorshDeserialize::deserialize(buf)?,
            })
        }
    }
    #[automatically_derived]
    impl ::core::clone::Clone for MarkPrice {
        #[inline]
        fn clone(&self) -> MarkPrice {
            MarkPrice {
                product_key: ::core::clone::Clone::clone(&self.product_key),
                mark_price: ::core::clone::Clone::clone(&self.mark_price),
                prev_oracle_minus_book_ewma: ::core::clone::Clone::clone(
                    &self.prev_oracle_minus_book_ewma,
                ),
                oracle_minus_book_ewma: ::core::clone::Clone::clone(
                    &self.oracle_minus_book_ewma,
                ),
            }
        }
    }
    pub enum RiskError {
        InvalidAccountTag,
        AccountAlreadyInitialized,
        InvalidRiskSigner,
        InvalidAccountOwner,
        InvalidAccountAddress,
        InvalidCovarianceAuthority,
        InvalidCovarianceMatrixAccess,
        MissingCovarianceEntry,
        InvalidSqrtInput,
        InvalidCovarianceInput,
        MissingBBOForMarkPrice,
        NumericalOverflow,
        UnexpectedProductType,
        UnexpectedResult,
        MismatchedRiskStateAccount,
        FailedToFindCacheIndexForLeg,
        ComboSizeGreaterThanCollectionLen,
        InvalidMarkPriceAccountsLen,
        MismatchedOraclePriceAccount,
        MissingMarkPrice,
        IncorrectMarkPricesBump,
        MarkPricesArrayIsFull,
        MarkPricesOutOfDate,
    }
    #[automatically_derived]
    impl ::core::marker::Copy for RiskError {}
    impl borsh::ser::BorshSerialize for RiskError {
        fn serialize<W: borsh::maybestd::io::Write>(
            &self,
            writer: &mut W,
        ) -> core::result::Result<(), borsh::maybestd::io::Error> {
            let variant_idx: u8 = match self {
                RiskError::InvalidAccountTag => 0u8,
                RiskError::AccountAlreadyInitialized => 1u8,
                RiskError::InvalidRiskSigner => 2u8,
                RiskError::InvalidAccountOwner => 3u8,
                RiskError::InvalidAccountAddress => 4u8,
                RiskError::InvalidCovarianceAuthority => 5u8,
                RiskError::InvalidCovarianceMatrixAccess => 6u8,
                RiskError::MissingCovarianceEntry => 7u8,
                RiskError::InvalidSqrtInput => 8u8,
                RiskError::InvalidCovarianceInput => 9u8,
                RiskError::MissingBBOForMarkPrice => 10u8,
                RiskError::NumericalOverflow => 11u8,
                RiskError::UnexpectedProductType => 12u8,
                RiskError::UnexpectedResult => 13u8,
                RiskError::MismatchedRiskStateAccount => 14u8,
                RiskError::FailedToFindCacheIndexForLeg => 15u8,
                RiskError::ComboSizeGreaterThanCollectionLen => 16u8,
                RiskError::InvalidMarkPriceAccountsLen => 17u8,
                RiskError::MismatchedOraclePriceAccount => 18u8,
                RiskError::MissingMarkPrice => 19u8,
                RiskError::IncorrectMarkPricesBump => 20u8,
                RiskError::MarkPricesArrayIsFull => 21u8,
                RiskError::MarkPricesOutOfDate => 22u8,
            };
            writer.write_all(&variant_idx.to_le_bytes())?;
            match self {
                RiskError::InvalidAccountTag => {}
                RiskError::AccountAlreadyInitialized => {}
                RiskError::InvalidRiskSigner => {}
                RiskError::InvalidAccountOwner => {}
                RiskError::InvalidAccountAddress => {}
                RiskError::InvalidCovarianceAuthority => {}
                RiskError::InvalidCovarianceMatrixAccess => {}
                RiskError::MissingCovarianceEntry => {}
                RiskError::InvalidSqrtInput => {}
                RiskError::InvalidCovarianceInput => {}
                RiskError::MissingBBOForMarkPrice => {}
                RiskError::NumericalOverflow => {}
                RiskError::UnexpectedProductType => {}
                RiskError::UnexpectedResult => {}
                RiskError::MismatchedRiskStateAccount => {}
                RiskError::FailedToFindCacheIndexForLeg => {}
                RiskError::ComboSizeGreaterThanCollectionLen => {}
                RiskError::InvalidMarkPriceAccountsLen => {}
                RiskError::MismatchedOraclePriceAccount => {}
                RiskError::MissingMarkPrice => {}
                RiskError::IncorrectMarkPricesBump => {}
                RiskError::MarkPricesArrayIsFull => {}
                RiskError::MarkPricesOutOfDate => {}
            }
            Ok(())
        }
    }
    impl borsh::de::BorshDeserialize for RiskError {
        fn deserialize(
            buf: &mut &[u8],
        ) -> core::result::Result<Self, borsh::maybestd::io::Error> {
            let variant_idx: u8 = borsh::BorshDeserialize::deserialize(buf)?;
            let return_value = match variant_idx {
                0u8 => RiskError::InvalidAccountTag,
                1u8 => RiskError::AccountAlreadyInitialized,
                2u8 => RiskError::InvalidRiskSigner,
                3u8 => RiskError::InvalidAccountOwner,
                4u8 => RiskError::InvalidAccountAddress,
                5u8 => RiskError::InvalidCovarianceAuthority,
                6u8 => RiskError::InvalidCovarianceMatrixAccess,
                7u8 => RiskError::MissingCovarianceEntry,
                8u8 => RiskError::InvalidSqrtInput,
                9u8 => RiskError::InvalidCovarianceInput,
                10u8 => RiskError::MissingBBOForMarkPrice,
                11u8 => RiskError::NumericalOverflow,
                12u8 => RiskError::UnexpectedProductType,
                13u8 => RiskError::UnexpectedResult,
                14u8 => RiskError::MismatchedRiskStateAccount,
                15u8 => RiskError::FailedToFindCacheIndexForLeg,
                16u8 => RiskError::ComboSizeGreaterThanCollectionLen,
                17u8 => RiskError::InvalidMarkPriceAccountsLen,
                18u8 => RiskError::MismatchedOraclePriceAccount,
                19u8 => RiskError::MissingMarkPrice,
                20u8 => RiskError::IncorrectMarkPricesBump,
                21u8 => RiskError::MarkPricesArrayIsFull,
                22u8 => RiskError::MarkPricesOutOfDate,
                _ => {
                    let msg = {
                        let res = ::alloc::fmt::format(
                            ::core::fmt::Arguments::new_v1(
                                &["Unexpected variant index: "],
                                &[::core::fmt::ArgumentV1::new_debug(&variant_idx)],
                            ),
                        );
                        res
                    };
                    return Err(
                        borsh::maybestd::io::Error::new(
                            borsh::maybestd::io::ErrorKind::InvalidInput,
                            msg,
                        ),
                    );
                }
            };
            Ok(return_value)
        }
    }
    #[automatically_derived]
    impl ::core::clone::Clone for RiskError {
        #[inline]
        fn clone(&self) -> RiskError {
            match self {
                RiskError::InvalidAccountTag => RiskError::InvalidAccountTag,
                RiskError::AccountAlreadyInitialized => {
                    RiskError::AccountAlreadyInitialized
                }
                RiskError::InvalidRiskSigner => RiskError::InvalidRiskSigner,
                RiskError::InvalidAccountOwner => RiskError::InvalidAccountOwner,
                RiskError::InvalidAccountAddress => RiskError::InvalidAccountAddress,
                RiskError::InvalidCovarianceAuthority => {
                    RiskError::InvalidCovarianceAuthority
                }
                RiskError::InvalidCovarianceMatrixAccess => {
                    RiskError::InvalidCovarianceMatrixAccess
                }
                RiskError::MissingCovarianceEntry => RiskError::MissingCovarianceEntry,
                RiskError::InvalidSqrtInput => RiskError::InvalidSqrtInput,
                RiskError::InvalidCovarianceInput => RiskError::InvalidCovarianceInput,
                RiskError::MissingBBOForMarkPrice => RiskError::MissingBBOForMarkPrice,
                RiskError::NumericalOverflow => RiskError::NumericalOverflow,
                RiskError::UnexpectedProductType => RiskError::UnexpectedProductType,
                RiskError::UnexpectedResult => RiskError::UnexpectedResult,
                RiskError::MismatchedRiskStateAccount => {
                    RiskError::MismatchedRiskStateAccount
                }
                RiskError::FailedToFindCacheIndexForLeg => {
                    RiskError::FailedToFindCacheIndexForLeg
                }
                RiskError::ComboSizeGreaterThanCollectionLen => {
                    RiskError::ComboSizeGreaterThanCollectionLen
                }
                RiskError::InvalidMarkPriceAccountsLen => {
                    RiskError::InvalidMarkPriceAccountsLen
                }
                RiskError::MismatchedOraclePriceAccount => {
                    RiskError::MismatchedOraclePriceAccount
                }
                RiskError::MissingMarkPrice => RiskError::MissingMarkPrice,
                RiskError::IncorrectMarkPricesBump => RiskError::IncorrectMarkPricesBump,
                RiskError::MarkPricesArrayIsFull => RiskError::MarkPricesArrayIsFull,
                RiskError::MarkPricesOutOfDate => RiskError::MarkPricesOutOfDate,
            }
        }
    }
    #[automatically_derived]
    impl ::core::fmt::Debug for RiskError {
        fn fmt(&self, f: &mut ::core::fmt::Formatter) -> ::core::fmt::Result {
            match self {
                RiskError::InvalidAccountTag => {
                    ::core::fmt::Formatter::write_str(f, "InvalidAccountTag")
                }
                RiskError::AccountAlreadyInitialized => {
                    ::core::fmt::Formatter::write_str(f, "AccountAlreadyInitialized")
                }
                RiskError::InvalidRiskSigner => {
                    ::core::fmt::Formatter::write_str(f, "InvalidRiskSigner")
                }
                RiskError::InvalidAccountOwner => {
                    ::core::fmt::Formatter::write_str(f, "InvalidAccountOwner")
                }
                RiskError::InvalidAccountAddress => {
                    ::core::fmt::Formatter::write_str(f, "InvalidAccountAddress")
                }
                RiskError::InvalidCovarianceAuthority => {
                    ::core::fmt::Formatter::write_str(f, "InvalidCovarianceAuthority")
                }
                RiskError::InvalidCovarianceMatrixAccess => {
                    ::core::fmt::Formatter::write_str(f, "InvalidCovarianceMatrixAccess")
                }
                RiskError::MissingCovarianceEntry => {
                    ::core::fmt::Formatter::write_str(f, "MissingCovarianceEntry")
                }
                RiskError::InvalidSqrtInput => {
                    ::core::fmt::Formatter::write_str(f, "InvalidSqrtInput")
                }
                RiskError::InvalidCovarianceInput => {
                    ::core::fmt::Formatter::write_str(f, "InvalidCovarianceInput")
                }
                RiskError::MissingBBOForMarkPrice => {
                    ::core::fmt::Formatter::write_str(f, "MissingBBOForMarkPrice")
                }
                RiskError::NumericalOverflow => {
                    ::core::fmt::Formatter::write_str(f, "NumericalOverflow")
                }
                RiskError::UnexpectedProductType => {
                    ::core::fmt::Formatter::write_str(f, "UnexpectedProductType")
                }
                RiskError::UnexpectedResult => {
                    ::core::fmt::Formatter::write_str(f, "UnexpectedResult")
                }
                RiskError::MismatchedRiskStateAccount => {
                    ::core::fmt::Formatter::write_str(f, "MismatchedRiskStateAccount")
                }
                RiskError::FailedToFindCacheIndexForLeg => {
                    ::core::fmt::Formatter::write_str(f, "FailedToFindCacheIndexForLeg")
                }
                RiskError::ComboSizeGreaterThanCollectionLen => {
                    ::core::fmt::Formatter::write_str(
                        f,
                        "ComboSizeGreaterThanCollectionLen",
                    )
                }
                RiskError::InvalidMarkPriceAccountsLen => {
                    ::core::fmt::Formatter::write_str(f, "InvalidMarkPriceAccountsLen")
                }
                RiskError::MismatchedOraclePriceAccount => {
                    ::core::fmt::Formatter::write_str(f, "MismatchedOraclePriceAccount")
                }
                RiskError::MissingMarkPrice => {
                    ::core::fmt::Formatter::write_str(f, "MissingMarkPrice")
                }
                RiskError::IncorrectMarkPricesBump => {
                    ::core::fmt::Formatter::write_str(f, "IncorrectMarkPricesBump")
                }
                RiskError::MarkPricesArrayIsFull => {
                    ::core::fmt::Formatter::write_str(f, "MarkPricesArrayIsFull")
                }
                RiskError::MarkPricesOutOfDate => {
                    ::core::fmt::Formatter::write_str(f, "MarkPricesOutOfDate")
                }
            }
        }
    }
    impl Default for RiskError {
        fn default() -> Self {
            Self::InvalidAccountTag
        }
    }
    pub enum RiskAccountTag {
        Uninitialized,
        CovarianceMetadata,
        CorrelationMatrix,
        VarianceCache,
    }
    #[automatically_derived]
    impl ::core::marker::Copy for RiskAccountTag {}
    impl borsh::ser::BorshSerialize for RiskAccountTag {
        fn serialize<W: borsh::maybestd::io::Write>(
            &self,
            writer: &mut W,
        ) -> core::result::Result<(), borsh::maybestd::io::Error> {
            let variant_idx: u8 = match self {
                RiskAccountTag::Uninitialized => 0u8,
                RiskAccountTag::CovarianceMetadata => 1u8,
                RiskAccountTag::CorrelationMatrix => 2u8,
                RiskAccountTag::VarianceCache => 3u8,
            };
            writer.write_all(&variant_idx.to_le_bytes())?;
            match self {
                RiskAccountTag::Uninitialized => {}
                RiskAccountTag::CovarianceMetadata => {}
                RiskAccountTag::CorrelationMatrix => {}
                RiskAccountTag::VarianceCache => {}
            }
            Ok(())
        }
    }
    impl borsh::de::BorshDeserialize for RiskAccountTag {
        fn deserialize(
            buf: &mut &[u8],
        ) -> core::result::Result<Self, borsh::maybestd::io::Error> {
            let variant_idx: u8 = borsh::BorshDeserialize::deserialize(buf)?;
            let return_value = match variant_idx {
                0u8 => RiskAccountTag::Uninitialized,
                1u8 => RiskAccountTag::CovarianceMetadata,
                2u8 => RiskAccountTag::CorrelationMatrix,
                3u8 => RiskAccountTag::VarianceCache,
                _ => {
                    let msg = {
                        let res = ::alloc::fmt::format(
                            ::core::fmt::Arguments::new_v1(
                                &["Unexpected variant index: "],
                                &[::core::fmt::ArgumentV1::new_debug(&variant_idx)],
                            ),
                        );
                        res
                    };
                    return Err(
                        borsh::maybestd::io::Error::new(
                            borsh::maybestd::io::ErrorKind::InvalidInput,
                            msg,
                        ),
                    );
                }
            };
            Ok(return_value)
        }
    }
    #[automatically_derived]
    impl ::core::clone::Clone for RiskAccountTag {
        #[inline]
        fn clone(&self) -> RiskAccountTag {
            match self {
                RiskAccountTag::Uninitialized => RiskAccountTag::Uninitialized,
                RiskAccountTag::CovarianceMetadata => RiskAccountTag::CovarianceMetadata,
                RiskAccountTag::CorrelationMatrix => RiskAccountTag::CorrelationMatrix,
                RiskAccountTag::VarianceCache => RiskAccountTag::VarianceCache,
            }
        }
    }
    #[automatically_derived]
    impl ::core::fmt::Debug for RiskAccountTag {
        fn fmt(&self, f: &mut ::core::fmt::Formatter) -> ::core::fmt::Result {
            match self {
                RiskAccountTag::Uninitialized => {
                    ::core::fmt::Formatter::write_str(f, "Uninitialized")
                }
                RiskAccountTag::CovarianceMetadata => {
                    ::core::fmt::Formatter::write_str(f, "CovarianceMetadata")
                }
                RiskAccountTag::CorrelationMatrix => {
                    ::core::fmt::Formatter::write_str(f, "CorrelationMatrix")
                }
                RiskAccountTag::VarianceCache => {
                    ::core::fmt::Formatter::write_str(f, "VarianceCache")
                }
            }
        }
    }
    impl Default for RiskAccountTag {
        fn default() -> Self {
            Self::Uninitialized
        }
    }
}
pub mod state {
    //! Structs of accounts which hold state.
    use super::*;
    /// Account: CorrelationMatrix
    pub struct CorrelationMatrix {
        pub tag: RiskAccountTag,
        pub num_active_products: u64,
        pub correlations: [i8; 10],
    }
    #[automatically_derived]
    impl ::core::default::Default for CorrelationMatrix {
        #[inline]
        fn default() -> CorrelationMatrix {
            CorrelationMatrix {
                tag: ::core::default::Default::default(),
                num_active_products: ::core::default::Default::default(),
                correlations: ::core::default::Default::default(),
            }
        }
    }
    #[automatically_derived]
    impl ::core::marker::Copy for CorrelationMatrix {}
    impl borsh::ser::BorshSerialize for CorrelationMatrix
    where
        RiskAccountTag: borsh::ser::BorshSerialize,
        u64: borsh::ser::BorshSerialize,
        [i8; 10]: borsh::ser::BorshSerialize,
    {
        fn serialize<W: borsh::maybestd::io::Write>(
            &self,
            writer: &mut W,
        ) -> ::core::result::Result<(), borsh::maybestd::io::Error> {
            borsh::BorshSerialize::serialize(&self.tag, writer)?;
            borsh::BorshSerialize::serialize(&self.num_active_products, writer)?;
            borsh::BorshSerialize::serialize(&self.correlations, writer)?;
            Ok(())
        }
    }
    impl borsh::de::BorshDeserialize for CorrelationMatrix
    where
        RiskAccountTag: borsh::BorshDeserialize,
        u64: borsh::BorshDeserialize,
        [i8; 10]: borsh::BorshDeserialize,
    {
        fn deserialize(
            buf: &mut &[u8],
        ) -> ::core::result::Result<Self, borsh::maybestd::io::Error> {
            Ok(Self {
                tag: borsh::BorshDeserialize::deserialize(buf)?,
                num_active_products: borsh::BorshDeserialize::deserialize(buf)?,
                correlations: borsh::BorshDeserialize::deserialize(buf)?,
            })
        }
    }
    #[automatically_derived]
    impl ::core::clone::Clone for CorrelationMatrix {
        #[inline]
        fn clone(&self) -> CorrelationMatrix {
            CorrelationMatrix {
                tag: ::core::clone::Clone::clone(&self.tag),
                num_active_products: ::core::clone::Clone::clone(
                    &self.num_active_products,
                ),
                correlations: ::core::clone::Clone::clone(&self.correlations),
            }
        }
    }
    #[automatically_derived]
    impl anchor_lang::AccountSerialize for CorrelationMatrix {
        fn try_serialize<W: std::io::Write>(
            &self,
            writer: &mut W,
        ) -> anchor_lang::Result<()> {
            if writer.write_all(&[129, 54, 133, 182, 96, 31, 79, 57]).is_err() {
                return Err(anchor_lang::error::ErrorCode::AccountDidNotSerialize.into());
            }
            if AnchorSerialize::serialize(self, writer).is_err() {
                return Err(anchor_lang::error::ErrorCode::AccountDidNotSerialize.into());
            }
            Ok(())
        }
    }
    #[automatically_derived]
    impl anchor_lang::AccountDeserialize for CorrelationMatrix {
        fn try_deserialize(buf: &mut &[u8]) -> anchor_lang::Result<Self> {
            if buf.len() < [129, 54, 133, 182, 96, 31, 79, 57].len() {
                return Err(
                    anchor_lang::error::ErrorCode::AccountDiscriminatorNotFound.into(),
                );
            }
            let given_disc = &buf[..8];
            if &[129, 54, 133, 182, 96, 31, 79, 57] != given_disc {
                return Err(
                    anchor_lang::error::ErrorCode::AccountDiscriminatorMismatch.into(),
                );
            }
            Self::try_deserialize_unchecked(buf)
        }
        fn try_deserialize_unchecked(buf: &mut &[u8]) -> anchor_lang::Result<Self> {
            let mut data: &[u8] = &buf[8..];
            AnchorDeserialize::deserialize(&mut data)
                .map_err(|_| {
                    anchor_lang::error::ErrorCode::AccountDidNotDeserialize.into()
                })
        }
    }
    #[automatically_derived]
    impl anchor_lang::Discriminator for CorrelationMatrix {
        fn discriminator() -> [u8; 8] {
            [129, 54, 133, 182, 96, 31, 79, 57]
        }
    }
    #[automatically_derived]
    impl anchor_lang::Owner for CorrelationMatrix {
        fn owner() -> Pubkey {
            crate::ID
        }
    }
    /// Account: CovarianceMetadata
    pub struct CovarianceMetadata {
        pub tag: RiskAccountTag,
        pub update_slot: u64,
        pub authority: Pubkey,
        pub num_active_products: u64,
        pub product_keys: [Pubkey; 128],
        pub standard_deviations: [FastInt; 128],
    }
    #[automatically_derived]
    impl ::core::marker::Copy for CovarianceMetadata {}
    impl borsh::ser::BorshSerialize for CovarianceMetadata
    where
        RiskAccountTag: borsh::ser::BorshSerialize,
        u64: borsh::ser::BorshSerialize,
        Pubkey: borsh::ser::BorshSerialize,
        u64: borsh::ser::BorshSerialize,
        [Pubkey; 128]: borsh::ser::BorshSerialize,
        [FastInt; 128]: borsh::ser::BorshSerialize,
    {
        fn serialize<W: borsh::maybestd::io::Write>(
            &self,
            writer: &mut W,
        ) -> ::core::result::Result<(), borsh::maybestd::io::Error> {
            borsh::BorshSerialize::serialize(&self.tag, writer)?;
            borsh::BorshSerialize::serialize(&self.update_slot, writer)?;
            borsh::BorshSerialize::serialize(&self.authority, writer)?;
            borsh::BorshSerialize::serialize(&self.num_active_products, writer)?;
            borsh::BorshSerialize::serialize(&self.product_keys, writer)?;
            borsh::BorshSerialize::serialize(&self.standard_deviations, writer)?;
            Ok(())
        }
    }
    impl borsh::de::BorshDeserialize for CovarianceMetadata
    where
        RiskAccountTag: borsh::BorshDeserialize,
        u64: borsh::BorshDeserialize,
        Pubkey: borsh::BorshDeserialize,
        u64: borsh::BorshDeserialize,
        [Pubkey; 128]: borsh::BorshDeserialize,
        [FastInt; 128]: borsh::BorshDeserialize,
    {
        fn deserialize(
            buf: &mut &[u8],
        ) -> ::core::result::Result<Self, borsh::maybestd::io::Error> {
            Ok(Self {
                tag: borsh::BorshDeserialize::deserialize(buf)?,
                update_slot: borsh::BorshDeserialize::deserialize(buf)?,
                authority: borsh::BorshDeserialize::deserialize(buf)?,
                num_active_products: borsh::BorshDeserialize::deserialize(buf)?,
                product_keys: borsh::BorshDeserialize::deserialize(buf)?,
                standard_deviations: borsh::BorshDeserialize::deserialize(buf)?,
            })
        }
    }
    #[automatically_derived]
    impl ::core::clone::Clone for CovarianceMetadata {
        #[inline]
        fn clone(&self) -> CovarianceMetadata {
            CovarianceMetadata {
                tag: ::core::clone::Clone::clone(&self.tag),
                update_slot: ::core::clone::Clone::clone(&self.update_slot),
                authority: ::core::clone::Clone::clone(&self.authority),
                num_active_products: ::core::clone::Clone::clone(
                    &self.num_active_products,
                ),
                product_keys: ::core::clone::Clone::clone(&self.product_keys),
                standard_deviations: ::core::clone::Clone::clone(
                    &self.standard_deviations,
                ),
            }
        }
    }
    #[automatically_derived]
    impl anchor_lang::AccountSerialize for CovarianceMetadata {
        fn try_serialize<W: std::io::Write>(
            &self,
            writer: &mut W,
        ) -> anchor_lang::Result<()> {
            if writer.write_all(&[102, 219, 161, 205, 189, 18, 108, 82]).is_err() {
                return Err(anchor_lang::error::ErrorCode::AccountDidNotSerialize.into());
            }
            if AnchorSerialize::serialize(self, writer).is_err() {
                return Err(anchor_lang::error::ErrorCode::AccountDidNotSerialize.into());
            }
            Ok(())
        }
    }
    #[automatically_derived]
    impl anchor_lang::AccountDeserialize for CovarianceMetadata {
        fn try_deserialize(buf: &mut &[u8]) -> anchor_lang::Result<Self> {
            if buf.len() < [102, 219, 161, 205, 189, 18, 108, 82].len() {
                return Err(
                    anchor_lang::error::ErrorCode::AccountDiscriminatorNotFound.into(),
                );
            }
            let given_disc = &buf[..8];
            if &[102, 219, 161, 205, 189, 18, 108, 82] != given_disc {
                return Err(
                    anchor_lang::error::ErrorCode::AccountDiscriminatorMismatch.into(),
                );
            }
            Self::try_deserialize_unchecked(buf)
        }
        fn try_deserialize_unchecked(buf: &mut &[u8]) -> anchor_lang::Result<Self> {
            let mut data: &[u8] = &buf[8..];
            AnchorDeserialize::deserialize(&mut data)
                .map_err(|_| {
                    anchor_lang::error::ErrorCode::AccountDidNotDeserialize.into()
                })
        }
    }
    #[automatically_derived]
    impl anchor_lang::Discriminator for CovarianceMetadata {
        fn discriminator() -> [u8; 8] {
            [102, 219, 161, 205, 189, 18, 108, 82]
        }
    }
    #[automatically_derived]
    impl anchor_lang::Owner for CovarianceMetadata {
        fn owner() -> Pubkey {
            crate::ID
        }
    }
    /// Account: MarkPricesArray
    pub struct MarkPricesArray {
        pub bump: u8,
        pub update_slot: u64,
        pub array: [MarkPrice; 64],
    }
    #[automatically_derived]
    impl ::core::marker::Copy for MarkPricesArray {}
    impl borsh::ser::BorshSerialize for MarkPricesArray
    where
        u8: borsh::ser::BorshSerialize,
        u64: borsh::ser::BorshSerialize,
        [MarkPrice; 64]: borsh::ser::BorshSerialize,
    {
        fn serialize<W: borsh::maybestd::io::Write>(
            &self,
            writer: &mut W,
        ) -> ::core::result::Result<(), borsh::maybestd::io::Error> {
            borsh::BorshSerialize::serialize(&self.bump, writer)?;
            borsh::BorshSerialize::serialize(&self.update_slot, writer)?;
            borsh::BorshSerialize::serialize(&self.array, writer)?;
            Ok(())
        }
    }
    impl borsh::de::BorshDeserialize for MarkPricesArray
    where
        u8: borsh::BorshDeserialize,
        u64: borsh::BorshDeserialize,
        [MarkPrice; 64]: borsh::BorshDeserialize,
    {
        fn deserialize(
            buf: &mut &[u8],
        ) -> ::core::result::Result<Self, borsh::maybestd::io::Error> {
            Ok(Self {
                bump: borsh::BorshDeserialize::deserialize(buf)?,
                update_slot: borsh::BorshDeserialize::deserialize(buf)?,
                array: borsh::BorshDeserialize::deserialize(buf)?,
            })
        }
    }
    #[automatically_derived]
    impl ::core::clone::Clone for MarkPricesArray {
        #[inline]
        fn clone(&self) -> MarkPricesArray {
            MarkPricesArray {
                bump: ::core::clone::Clone::clone(&self.bump),
                update_slot: ::core::clone::Clone::clone(&self.update_slot),
                array: ::core::clone::Clone::clone(&self.array),
            }
        }
    }
    #[automatically_derived]
    impl anchor_lang::AccountSerialize for MarkPricesArray {
        fn try_serialize<W: std::io::Write>(
            &self,
            writer: &mut W,
        ) -> anchor_lang::Result<()> {
            if writer.write_all(&[242, 215, 227, 212, 118, 105, 223, 108]).is_err() {
                return Err(anchor_lang::error::ErrorCode::AccountDidNotSerialize.into());
            }
            if AnchorSerialize::serialize(self, writer).is_err() {
                return Err(anchor_lang::error::ErrorCode::AccountDidNotSerialize.into());
            }
            Ok(())
        }
    }
    #[automatically_derived]
    impl anchor_lang::AccountDeserialize for MarkPricesArray {
        fn try_deserialize(buf: &mut &[u8]) -> anchor_lang::Result<Self> {
            if buf.len() < [242, 215, 227, 212, 118, 105, 223, 108].len() {
                return Err(
                    anchor_lang::error::ErrorCode::AccountDiscriminatorNotFound.into(),
                );
            }
            let given_disc = &buf[..8];
            if &[242, 215, 227, 212, 118, 105, 223, 108] != given_disc {
                return Err(
                    anchor_lang::error::ErrorCode::AccountDiscriminatorMismatch.into(),
                );
            }
            Self::try_deserialize_unchecked(buf)
        }
        fn try_deserialize_unchecked(buf: &mut &[u8]) -> anchor_lang::Result<Self> {
            let mut data: &[u8] = &buf[8..];
            AnchorDeserialize::deserialize(&mut data)
                .map_err(|_| {
                    anchor_lang::error::ErrorCode::AccountDidNotDeserialize.into()
                })
        }
    }
    #[automatically_derived]
    impl anchor_lang::Discriminator for MarkPricesArray {
        fn discriminator() -> [u8; 8] {
            [242, 215, 227, 212, 118, 105, 223, 108]
        }
    }
    #[automatically_derived]
    impl anchor_lang::Owner for MarkPricesArray {
        fn owner() -> Pubkey {
            crate::ID
        }
    }
    /// Account: PaddedMarkPricesArray
    pub struct PaddedMarkPricesArray {
        pub bump: u8,
        pub padding0: [u8; 7],
        pub update_slot: u64,
        pub is_hardcoded_oracle: bool,
        pub hardcoded_oracle: Pubkey,
        pub padding1: [u8; 7],
        pub hardcoded_oracle_type: OracleType,
        pub padding2: [u8; 7],
        pub array: [MarkPrice; 64],
    }
    #[automatically_derived]
    impl ::core::marker::Copy for PaddedMarkPricesArray {}
    impl borsh::ser::BorshSerialize for PaddedMarkPricesArray
    where
        u8: borsh::ser::BorshSerialize,
        [u8; 7]: borsh::ser::BorshSerialize,
        u64: borsh::ser::BorshSerialize,
        bool: borsh::ser::BorshSerialize,
        Pubkey: borsh::ser::BorshSerialize,
        [u8; 7]: borsh::ser::BorshSerialize,
        OracleType: borsh::ser::BorshSerialize,
        [u8; 7]: borsh::ser::BorshSerialize,
        [MarkPrice; 64]: borsh::ser::BorshSerialize,
    {
        fn serialize<W: borsh::maybestd::io::Write>(
            &self,
            writer: &mut W,
        ) -> ::core::result::Result<(), borsh::maybestd::io::Error> {
            borsh::BorshSerialize::serialize(&self.bump, writer)?;
            borsh::BorshSerialize::serialize(&self.padding0, writer)?;
            borsh::BorshSerialize::serialize(&self.update_slot, writer)?;
            borsh::BorshSerialize::serialize(&self.is_hardcoded_oracle, writer)?;
            borsh::BorshSerialize::serialize(&self.hardcoded_oracle, writer)?;
            borsh::BorshSerialize::serialize(&self.padding1, writer)?;
            borsh::BorshSerialize::serialize(&self.hardcoded_oracle_type, writer)?;
            borsh::BorshSerialize::serialize(&self.padding2, writer)?;
            borsh::BorshSerialize::serialize(&self.array, writer)?;
            Ok(())
        }
    }
    impl borsh::de::BorshDeserialize for PaddedMarkPricesArray
    where
        u8: borsh::BorshDeserialize,
        [u8; 7]: borsh::BorshDeserialize,
        u64: borsh::BorshDeserialize,
        bool: borsh::BorshDeserialize,
        Pubkey: borsh::BorshDeserialize,
        [u8; 7]: borsh::BorshDeserialize,
        OracleType: borsh::BorshDeserialize,
        [u8; 7]: borsh::BorshDeserialize,
        [MarkPrice; 64]: borsh::BorshDeserialize,
    {
        fn deserialize(
            buf: &mut &[u8],
        ) -> ::core::result::Result<Self, borsh::maybestd::io::Error> {
            Ok(Self {
                bump: borsh::BorshDeserialize::deserialize(buf)?,
                padding0: borsh::BorshDeserialize::deserialize(buf)?,
                update_slot: borsh::BorshDeserialize::deserialize(buf)?,
                is_hardcoded_oracle: borsh::BorshDeserialize::deserialize(buf)?,
                hardcoded_oracle: borsh::BorshDeserialize::deserialize(buf)?,
                padding1: borsh::BorshDeserialize::deserialize(buf)?,
                hardcoded_oracle_type: borsh::BorshDeserialize::deserialize(buf)?,
                padding2: borsh::BorshDeserialize::deserialize(buf)?,
                array: borsh::BorshDeserialize::deserialize(buf)?,
            })
        }
    }
    #[automatically_derived]
    impl ::core::clone::Clone for PaddedMarkPricesArray {
        #[inline]
        fn clone(&self) -> PaddedMarkPricesArray {
            PaddedMarkPricesArray {
                bump: ::core::clone::Clone::clone(&self.bump),
                padding0: ::core::clone::Clone::clone(&self.padding0),
                update_slot: ::core::clone::Clone::clone(&self.update_slot),
                is_hardcoded_oracle: ::core::clone::Clone::clone(
                    &self.is_hardcoded_oracle,
                ),
                hardcoded_oracle: ::core::clone::Clone::clone(&self.hardcoded_oracle),
                padding1: ::core::clone::Clone::clone(&self.padding1),
                hardcoded_oracle_type: ::core::clone::Clone::clone(
                    &self.hardcoded_oracle_type,
                ),
                padding2: ::core::clone::Clone::clone(&self.padding2),
                array: ::core::clone::Clone::clone(&self.array),
            }
        }
    }
    #[automatically_derived]
    impl anchor_lang::AccountSerialize for PaddedMarkPricesArray {
        fn try_serialize<W: std::io::Write>(
            &self,
            writer: &mut W,
        ) -> anchor_lang::Result<()> {
            if writer.write_all(&[105, 57, 179, 110, 60, 65, 25, 12]).is_err() {
                return Err(anchor_lang::error::ErrorCode::AccountDidNotSerialize.into());
            }
            if AnchorSerialize::serialize(self, writer).is_err() {
                return Err(anchor_lang::error::ErrorCode::AccountDidNotSerialize.into());
            }
            Ok(())
        }
    }
    #[automatically_derived]
    impl anchor_lang::AccountDeserialize for PaddedMarkPricesArray {
        fn try_deserialize(buf: &mut &[u8]) -> anchor_lang::Result<Self> {
            if buf.len() < [105, 57, 179, 110, 60, 65, 25, 12].len() {
                return Err(
                    anchor_lang::error::ErrorCode::AccountDiscriminatorNotFound.into(),
                );
            }
            let given_disc = &buf[..8];
            if &[105, 57, 179, 110, 60, 65, 25, 12] != given_disc {
                return Err(
                    anchor_lang::error::ErrorCode::AccountDiscriminatorMismatch.into(),
                );
            }
            Self::try_deserialize_unchecked(buf)
        }
        fn try_deserialize_unchecked(buf: &mut &[u8]) -> anchor_lang::Result<Self> {
            let mut data: &[u8] = &buf[8..];
            AnchorDeserialize::deserialize(&mut data)
                .map_err(|_| {
                    anchor_lang::error::ErrorCode::AccountDidNotDeserialize.into()
                })
        }
    }
    #[automatically_derived]
    impl anchor_lang::Discriminator for PaddedMarkPricesArray {
        fn discriminator() -> [u8; 8] {
            [105, 57, 179, 110, 60, 65, 25, 12]
        }
    }
    #[automatically_derived]
    impl anchor_lang::Owner for PaddedMarkPricesArray {
        fn owner() -> Pubkey {
            crate::ID
        }
    }
    /// Account: VarianceCache
    pub struct VarianceCache {
        pub tag: RiskAccountTag,
        pub update_slot: u64,
        pub position_value: FastInt,
        pub total_variance: FastInt,
        pub open_order_variance: FastInt,
        pub product_indexes: [u64; 32],
        pub positions: [FastInt; 32],
        pub sigma_p: [FastInt; 32],
    }
    #[automatically_derived]
    impl ::core::default::Default for VarianceCache {
        #[inline]
        fn default() -> VarianceCache {
            VarianceCache {
                tag: ::core::default::Default::default(),
                update_slot: ::core::default::Default::default(),
                position_value: ::core::default::Default::default(),
                total_variance: ::core::default::Default::default(),
                open_order_variance: ::core::default::Default::default(),
                product_indexes: ::core::default::Default::default(),
                positions: ::core::default::Default::default(),
                sigma_p: ::core::default::Default::default(),
            }
        }
    }
    #[automatically_derived]
    impl ::core::marker::Copy for VarianceCache {}
    impl borsh::ser::BorshSerialize for VarianceCache
    where
        RiskAccountTag: borsh::ser::BorshSerialize,
        u64: borsh::ser::BorshSerialize,
        FastInt: borsh::ser::BorshSerialize,
        FastInt: borsh::ser::BorshSerialize,
        FastInt: borsh::ser::BorshSerialize,
        [u64; 32]: borsh::ser::BorshSerialize,
        [FastInt; 32]: borsh::ser::BorshSerialize,
        [FastInt; 32]: borsh::ser::BorshSerialize,
    {
        fn serialize<W: borsh::maybestd::io::Write>(
            &self,
            writer: &mut W,
        ) -> ::core::result::Result<(), borsh::maybestd::io::Error> {
            borsh::BorshSerialize::serialize(&self.tag, writer)?;
            borsh::BorshSerialize::serialize(&self.update_slot, writer)?;
            borsh::BorshSerialize::serialize(&self.position_value, writer)?;
            borsh::BorshSerialize::serialize(&self.total_variance, writer)?;
            borsh::BorshSerialize::serialize(&self.open_order_variance, writer)?;
            borsh::BorshSerialize::serialize(&self.product_indexes, writer)?;
            borsh::BorshSerialize::serialize(&self.positions, writer)?;
            borsh::BorshSerialize::serialize(&self.sigma_p, writer)?;
            Ok(())
        }
    }
    impl borsh::de::BorshDeserialize for VarianceCache
    where
        RiskAccountTag: borsh::BorshDeserialize,
        u64: borsh::BorshDeserialize,
        FastInt: borsh::BorshDeserialize,
        FastInt: borsh::BorshDeserialize,
        FastInt: borsh::BorshDeserialize,
        [u64; 32]: borsh::BorshDeserialize,
        [FastInt; 32]: borsh::BorshDeserialize,
        [FastInt; 32]: borsh::BorshDeserialize,
    {
        fn deserialize(
            buf: &mut &[u8],
        ) -> ::core::result::Result<Self, borsh::maybestd::io::Error> {
            Ok(Self {
                tag: borsh::BorshDeserialize::deserialize(buf)?,
                update_slot: borsh::BorshDeserialize::deserialize(buf)?,
                position_value: borsh::BorshDeserialize::deserialize(buf)?,
                total_variance: borsh::BorshDeserialize::deserialize(buf)?,
                open_order_variance: borsh::BorshDeserialize::deserialize(buf)?,
                product_indexes: borsh::BorshDeserialize::deserialize(buf)?,
                positions: borsh::BorshDeserialize::deserialize(buf)?,
                sigma_p: borsh::BorshDeserialize::deserialize(buf)?,
            })
        }
    }
    #[automatically_derived]
    impl ::core::clone::Clone for VarianceCache {
        #[inline]
        fn clone(&self) -> VarianceCache {
            VarianceCache {
                tag: ::core::clone::Clone::clone(&self.tag),
                update_slot: ::core::clone::Clone::clone(&self.update_slot),
                position_value: ::core::clone::Clone::clone(&self.position_value),
                total_variance: ::core::clone::Clone::clone(&self.total_variance),
                open_order_variance: ::core::clone::Clone::clone(
                    &self.open_order_variance,
                ),
                product_indexes: ::core::clone::Clone::clone(&self.product_indexes),
                positions: ::core::clone::Clone::clone(&self.positions),
                sigma_p: ::core::clone::Clone::clone(&self.sigma_p),
            }
        }
    }
    #[automatically_derived]
    impl anchor_lang::AccountSerialize for VarianceCache {
        fn try_serialize<W: std::io::Write>(
            &self,
            writer: &mut W,
        ) -> anchor_lang::Result<()> {
            if writer.write_all(&[232, 75, 30, 102, 98, 89, 218, 170]).is_err() {
                return Err(anchor_lang::error::ErrorCode::AccountDidNotSerialize.into());
            }
            if AnchorSerialize::serialize(self, writer).is_err() {
                return Err(anchor_lang::error::ErrorCode::AccountDidNotSerialize.into());
            }
            Ok(())
        }
    }
    #[automatically_derived]
    impl anchor_lang::AccountDeserialize for VarianceCache {
        fn try_deserialize(buf: &mut &[u8]) -> anchor_lang::Result<Self> {
            if buf.len() < [232, 75, 30, 102, 98, 89, 218, 170].len() {
                return Err(
                    anchor_lang::error::ErrorCode::AccountDiscriminatorNotFound.into(),
                );
            }
            let given_disc = &buf[..8];
            if &[232, 75, 30, 102, 98, 89, 218, 170] != given_disc {
                return Err(
                    anchor_lang::error::ErrorCode::AccountDiscriminatorMismatch.into(),
                );
            }
            Self::try_deserialize_unchecked(buf)
        }
        fn try_deserialize_unchecked(buf: &mut &[u8]) -> anchor_lang::Result<Self> {
            let mut data: &[u8] = &buf[8..];
            AnchorDeserialize::deserialize(&mut data)
                .map_err(|_| {
                    anchor_lang::error::ErrorCode::AccountDidNotDeserialize.into()
                })
        }
    }
    #[automatically_derived]
    impl anchor_lang::Discriminator for VarianceCache {
        fn discriminator() -> [u8; 8] {
            [232, 75, 30, 102, 98, 89, 218, 170]
        }
    }
    #[automatically_derived]
    impl anchor_lang::Owner for VarianceCache {
        fn owner() -> Pubkey {
            crate::ID
        }
    }
}
pub mod ix_accounts {
    //! Accounts used in instructions.
    use super::*;
    pub struct ValidateAccountHealth<'info> {
        pub market_product_group: AccountInfo<'info>,
        pub trader_risk_group: AccountInfo<'info>,
        #[account(mut)]
        pub risk_output_register: AccountInfo<'info>,
        #[account(mut)]
        pub variance_cache: AccountInfo<'info>,
        pub risk_model_configuration: AccountInfo<'info>,
        pub risk_signer: Signer<'info>,
        pub clock: AccountInfo<'info>,
        pub covariance_metadata: AccountInfo<'info>,
        pub correlation_matrix: AccountInfo<'info>,
        #[account(mut)]
        pub mark_prices: AccountInfo<'info>,
    }
    #[automatically_derived]
    impl<'info> anchor_lang::Accounts<'info> for ValidateAccountHealth<'info>
    where
        'info: 'info,
    {
        #[inline(never)]
        fn try_accounts(
            program_id: &anchor_lang::solana_program::pubkey::Pubkey,
            accounts: &mut &[anchor_lang::solana_program::account_info::AccountInfo<
                'info,
            >],
            ix_data: &[u8],
            __bumps: &mut std::collections::BTreeMap<String, u8>,
        ) -> anchor_lang::Result<Self> {
            let market_product_group: AccountInfo = anchor_lang::Accounts::try_accounts(
                    program_id,
                    accounts,
                    ix_data,
                    __bumps,
                )
                .map_err(|e| e.with_account_name("market_product_group"))?;
            let trader_risk_group: AccountInfo = anchor_lang::Accounts::try_accounts(
                    program_id,
                    accounts,
                    ix_data,
                    __bumps,
                )
                .map_err(|e| e.with_account_name("trader_risk_group"))?;
            let risk_output_register: AccountInfo = anchor_lang::Accounts::try_accounts(
                    program_id,
                    accounts,
                    ix_data,
                    __bumps,
                )
                .map_err(|e| e.with_account_name("risk_output_register"))?;
            let variance_cache: AccountInfo = anchor_lang::Accounts::try_accounts(
                    program_id,
                    accounts,
                    ix_data,
                    __bumps,
                )
                .map_err(|e| e.with_account_name("variance_cache"))?;
            let risk_model_configuration: AccountInfo = anchor_lang::Accounts::try_accounts(
                    program_id,
                    accounts,
                    ix_data,
                    __bumps,
                )
                .map_err(|e| e.with_account_name("risk_model_configuration"))?;
            let risk_signer: Signer = anchor_lang::Accounts::try_accounts(
                    program_id,
                    accounts,
                    ix_data,
                    __bumps,
                )
                .map_err(|e| e.with_account_name("risk_signer"))?;
            let clock: AccountInfo = anchor_lang::Accounts::try_accounts(
                    program_id,
                    accounts,
                    ix_data,
                    __bumps,
                )
                .map_err(|e| e.with_account_name("clock"))?;
            let covariance_metadata: AccountInfo = anchor_lang::Accounts::try_accounts(
                    program_id,
                    accounts,
                    ix_data,
                    __bumps,
                )
                .map_err(|e| e.with_account_name("covariance_metadata"))?;
            let correlation_matrix: AccountInfo = anchor_lang::Accounts::try_accounts(
                    program_id,
                    accounts,
                    ix_data,
                    __bumps,
                )
                .map_err(|e| e.with_account_name("correlation_matrix"))?;
            let mark_prices: AccountInfo = anchor_lang::Accounts::try_accounts(
                    program_id,
                    accounts,
                    ix_data,
                    __bumps,
                )
                .map_err(|e| e.with_account_name("mark_prices"))?;
            if !risk_output_register.to_account_info().is_writable {
                return Err(
                    anchor_lang::error::Error::from(
                            anchor_lang::error::ErrorCode::ConstraintMut,
                        )
                        .with_account_name("risk_output_register"),
                );
            }
            if !variance_cache.to_account_info().is_writable {
                return Err(
                    anchor_lang::error::Error::from(
                            anchor_lang::error::ErrorCode::ConstraintMut,
                        )
                        .with_account_name("variance_cache"),
                );
            }
            if !mark_prices.to_account_info().is_writable {
                return Err(
                    anchor_lang::error::Error::from(
                            anchor_lang::error::ErrorCode::ConstraintMut,
                        )
                        .with_account_name("mark_prices"),
                );
            }
            Ok(ValidateAccountHealth {
                market_product_group,
                trader_risk_group,
                risk_output_register,
                variance_cache,
                risk_model_configuration,
                risk_signer,
                clock,
                covariance_metadata,
                correlation_matrix,
                mark_prices,
            })
        }
    }
    #[automatically_derived]
    impl<'info> anchor_lang::ToAccountInfos<'info> for ValidateAccountHealth<'info>
    where
        'info: 'info,
    {
        fn to_account_infos(
            &self,
        ) -> Vec<anchor_lang::solana_program::account_info::AccountInfo<'info>> {
            let mut account_infos = ::alloc::vec::Vec::new();
            account_infos.extend(self.market_product_group.to_account_infos());
            account_infos.extend(self.trader_risk_group.to_account_infos());
            account_infos.extend(self.risk_output_register.to_account_infos());
            account_infos.extend(self.variance_cache.to_account_infos());
            account_infos.extend(self.risk_model_configuration.to_account_infos());
            account_infos.extend(self.risk_signer.to_account_infos());
            account_infos.extend(self.clock.to_account_infos());
            account_infos.extend(self.covariance_metadata.to_account_infos());
            account_infos.extend(self.correlation_matrix.to_account_infos());
            account_infos.extend(self.mark_prices.to_account_infos());
            account_infos
        }
    }
    #[automatically_derived]
    impl<'info> anchor_lang::ToAccountMetas for ValidateAccountHealth<'info> {
        fn to_account_metas(
            &self,
            is_signer: Option<bool>,
        ) -> Vec<anchor_lang::solana_program::instruction::AccountMeta> {
            let mut account_metas = ::alloc::vec::Vec::new();
            account_metas.extend(self.market_product_group.to_account_metas(None));
            account_metas.extend(self.trader_risk_group.to_account_metas(None));
            account_metas.extend(self.risk_output_register.to_account_metas(None));
            account_metas.extend(self.variance_cache.to_account_metas(None));
            account_metas.extend(self.risk_model_configuration.to_account_metas(None));
            account_metas.extend(self.risk_signer.to_account_metas(None));
            account_metas.extend(self.clock.to_account_metas(None));
            account_metas.extend(self.covariance_metadata.to_account_metas(None));
            account_metas.extend(self.correlation_matrix.to_account_metas(None));
            account_metas.extend(self.mark_prices.to_account_metas(None));
            account_metas
        }
    }
    #[automatically_derived]
    impl<'info> anchor_lang::AccountsExit<'info> for ValidateAccountHealth<'info>
    where
        'info: 'info,
    {
        fn exit(
            &self,
            program_id: &anchor_lang::solana_program::pubkey::Pubkey,
        ) -> anchor_lang::Result<()> {
            anchor_lang::AccountsExit::exit(&self.risk_output_register, program_id)
                .map_err(|e| e.with_account_name("risk_output_register"))?;
            anchor_lang::AccountsExit::exit(&self.variance_cache, program_id)
                .map_err(|e| e.with_account_name("variance_cache"))?;
            anchor_lang::AccountsExit::exit(&self.mark_prices, program_id)
                .map_err(|e| e.with_account_name("mark_prices"))?;
            Ok(())
        }
    }
    /// An internal, Anchor generated module. This is used (as an
    /// implementation detail), to generate a struct for a given
    /// `#[derive(Accounts)]` implementation, where each field is a Pubkey,
    /// instead of an `AccountInfo`. This is useful for clients that want
    /// to generate a list of accounts, without explicitly knowing the
    /// order all the fields should be in.
    ///
    /// To access the struct in this module, one should use the sibling
    /// `accounts` module (also generated), which re-exports this.
    pub(crate) mod __client_accounts_validate_account_health {
        use super::*;
        use anchor_lang::prelude::borsh;
        /// Generated client accounts for [`ValidateAccountHealth`].
        pub struct ValidateAccountHealth {
            pub market_product_group: anchor_lang::solana_program::pubkey::Pubkey,
            pub trader_risk_group: anchor_lang::solana_program::pubkey::Pubkey,
            pub risk_output_register: anchor_lang::solana_program::pubkey::Pubkey,
            pub variance_cache: anchor_lang::solana_program::pubkey::Pubkey,
            pub risk_model_configuration: anchor_lang::solana_program::pubkey::Pubkey,
            pub risk_signer: anchor_lang::solana_program::pubkey::Pubkey,
            pub clock: anchor_lang::solana_program::pubkey::Pubkey,
            pub covariance_metadata: anchor_lang::solana_program::pubkey::Pubkey,
            pub correlation_matrix: anchor_lang::solana_program::pubkey::Pubkey,
            pub mark_prices: anchor_lang::solana_program::pubkey::Pubkey,
        }
        impl borsh::ser::BorshSerialize for ValidateAccountHealth
        where
            anchor_lang::solana_program::pubkey::Pubkey: borsh::ser::BorshSerialize,
            anchor_lang::solana_program::pubkey::Pubkey: borsh::ser::BorshSerialize,
            anchor_lang::solana_program::pubkey::Pubkey: borsh::ser::BorshSerialize,
            anchor_lang::solana_program::pubkey::Pubkey: borsh::ser::BorshSerialize,
            anchor_lang::solana_program::pubkey::Pubkey: borsh::ser::BorshSerialize,
            anchor_lang::solana_program::pubkey::Pubkey: borsh::ser::BorshSerialize,
            anchor_lang::solana_program::pubkey::Pubkey: borsh::ser::BorshSerialize,
            anchor_lang::solana_program::pubkey::Pubkey: borsh::ser::BorshSerialize,
            anchor_lang::solana_program::pubkey::Pubkey: borsh::ser::BorshSerialize,
            anchor_lang::solana_program::pubkey::Pubkey: borsh::ser::BorshSerialize,
        {
            fn serialize<W: borsh::maybestd::io::Write>(
                &self,
                writer: &mut W,
            ) -> ::core::result::Result<(), borsh::maybestd::io::Error> {
                borsh::BorshSerialize::serialize(&self.market_product_group, writer)?;
                borsh::BorshSerialize::serialize(&self.trader_risk_group, writer)?;
                borsh::BorshSerialize::serialize(&self.risk_output_register, writer)?;
                borsh::BorshSerialize::serialize(&self.variance_cache, writer)?;
                borsh::BorshSerialize::serialize(
                    &self.risk_model_configuration,
                    writer,
                )?;
                borsh::BorshSerialize::serialize(&self.risk_signer, writer)?;
                borsh::BorshSerialize::serialize(&self.clock, writer)?;
                borsh::BorshSerialize::serialize(&self.covariance_metadata, writer)?;
                borsh::BorshSerialize::serialize(&self.correlation_matrix, writer)?;
                borsh::BorshSerialize::serialize(&self.mark_prices, writer)?;
                Ok(())
            }
        }
        #[automatically_derived]
        impl anchor_lang::ToAccountMetas for ValidateAccountHealth {
            fn to_account_metas(
                &self,
                is_signer: Option<bool>,
            ) -> Vec<anchor_lang::solana_program::instruction::AccountMeta> {
                let mut account_metas = ::alloc::vec::Vec::new();
                account_metas
                    .push(
                        anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                            self.market_product_group,
                            false,
                        ),
                    );
                account_metas
                    .push(
                        anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                            self.trader_risk_group,
                            false,
                        ),
                    );
                account_metas
                    .push(
                        anchor_lang::solana_program::instruction::AccountMeta::new(
                            self.risk_output_register,
                            false,
                        ),
                    );
                account_metas
                    .push(
                        anchor_lang::solana_program::instruction::AccountMeta::new(
                            self.variance_cache,
                            false,
                        ),
                    );
                account_metas
                    .push(
                        anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                            self.risk_model_configuration,
                            false,
                        ),
                    );
                account_metas
                    .push(
                        anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                            self.risk_signer,
                            true,
                        ),
                    );
                account_metas
                    .push(
                        anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                            self.clock,
                            false,
                        ),
                    );
                account_metas
                    .push(
                        anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                            self.covariance_metadata,
                            false,
                        ),
                    );
                account_metas
                    .push(
                        anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                            self.correlation_matrix,
                            false,
                        ),
                    );
                account_metas
                    .push(
                        anchor_lang::solana_program::instruction::AccountMeta::new(
                            self.mark_prices,
                            false,
                        ),
                    );
                account_metas
            }
        }
    }
    /// An internal, Anchor generated module. This is used (as an
    /// implementation detail), to generate a CPI struct for a given
    /// `#[derive(Accounts)]` implementation, where each field is an
    /// AccountInfo.
    ///
    /// To access the struct in this module, one should use the sibling
    /// [`cpi::accounts`] module (also generated), which re-exports this.
    pub(crate) mod __cpi_client_accounts_validate_account_health {
        use super::*;
        /// Generated CPI struct of the accounts for [`ValidateAccountHealth`].
        pub struct ValidateAccountHealth<'info> {
            pub market_product_group: anchor_lang::solana_program::account_info::AccountInfo<
                'info,
            >,
            pub trader_risk_group: anchor_lang::solana_program::account_info::AccountInfo<
                'info,
            >,
            pub risk_output_register: anchor_lang::solana_program::account_info::AccountInfo<
                'info,
            >,
            pub variance_cache: anchor_lang::solana_program::account_info::AccountInfo<
                'info,
            >,
            pub risk_model_configuration: anchor_lang::solana_program::account_info::AccountInfo<
                'info,
            >,
            pub risk_signer: anchor_lang::solana_program::account_info::AccountInfo<
                'info,
            >,
            pub clock: anchor_lang::solana_program::account_info::AccountInfo<'info>,
            pub covariance_metadata: anchor_lang::solana_program::account_info::AccountInfo<
                'info,
            >,
            pub correlation_matrix: anchor_lang::solana_program::account_info::AccountInfo<
                'info,
            >,
            pub mark_prices: anchor_lang::solana_program::account_info::AccountInfo<
                'info,
            >,
        }
        #[automatically_derived]
        impl<'info> anchor_lang::ToAccountMetas for ValidateAccountHealth<'info> {
            fn to_account_metas(
                &self,
                is_signer: Option<bool>,
            ) -> Vec<anchor_lang::solana_program::instruction::AccountMeta> {
                let mut account_metas = ::alloc::vec::Vec::new();
                account_metas
                    .push(
                        anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                            anchor_lang::Key::key(&self.market_product_group),
                            false,
                        ),
                    );
                account_metas
                    .push(
                        anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                            anchor_lang::Key::key(&self.trader_risk_group),
                            false,
                        ),
                    );
                account_metas
                    .push(
                        anchor_lang::solana_program::instruction::AccountMeta::new(
                            anchor_lang::Key::key(&self.risk_output_register),
                            false,
                        ),
                    );
                account_metas
                    .push(
                        anchor_lang::solana_program::instruction::AccountMeta::new(
                            anchor_lang::Key::key(&self.variance_cache),
                            false,
                        ),
                    );
                account_metas
                    .push(
                        anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                            anchor_lang::Key::key(&self.risk_model_configuration),
                            false,
                        ),
                    );
                account_metas
                    .push(
                        anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                            anchor_lang::Key::key(&self.risk_signer),
                            true,
                        ),
                    );
                account_metas
                    .push(
                        anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                            anchor_lang::Key::key(&self.clock),
                            false,
                        ),
                    );
                account_metas
                    .push(
                        anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                            anchor_lang::Key::key(&self.covariance_metadata),
                            false,
                        ),
                    );
                account_metas
                    .push(
                        anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                            anchor_lang::Key::key(&self.correlation_matrix),
                            false,
                        ),
                    );
                account_metas
                    .push(
                        anchor_lang::solana_program::instruction::AccountMeta::new(
                            anchor_lang::Key::key(&self.mark_prices),
                            false,
                        ),
                    );
                account_metas
            }
        }
        #[automatically_derived]
        impl<'info> anchor_lang::ToAccountInfos<'info> for ValidateAccountHealth<'info> {
            fn to_account_infos(
                &self,
            ) -> Vec<anchor_lang::solana_program::account_info::AccountInfo<'info>> {
                let mut account_infos = ::alloc::vec::Vec::new();
                account_infos
                    .push(
                        anchor_lang::ToAccountInfo::to_account_info(
                            &self.market_product_group,
                        ),
                    );
                account_infos
                    .push(
                        anchor_lang::ToAccountInfo::to_account_info(
                            &self.trader_risk_group,
                        ),
                    );
                account_infos
                    .push(
                        anchor_lang::ToAccountInfo::to_account_info(
                            &self.risk_output_register,
                        ),
                    );
                account_infos
                    .push(
                        anchor_lang::ToAccountInfo::to_account_info(&self.variance_cache),
                    );
                account_infos
                    .push(
                        anchor_lang::ToAccountInfo::to_account_info(
                            &self.risk_model_configuration,
                        ),
                    );
                account_infos
                    .push(
                        anchor_lang::ToAccountInfo::to_account_info(&self.risk_signer),
                    );
                account_infos
                    .push(anchor_lang::ToAccountInfo::to_account_info(&self.clock));
                account_infos
                    .push(
                        anchor_lang::ToAccountInfo::to_account_info(
                            &self.covariance_metadata,
                        ),
                    );
                account_infos
                    .push(
                        anchor_lang::ToAccountInfo::to_account_info(
                            &self.correlation_matrix,
                        ),
                    );
                account_infos
                    .push(
                        anchor_lang::ToAccountInfo::to_account_info(&self.mark_prices),
                    );
                account_infos
            }
        }
    }
    pub struct ValidateAccountLiquidation<'info> {
        pub market_product_group: AccountInfo<'info>,
        pub trader_risk_group: AccountInfo<'info>,
        #[account(mut)]
        pub risk_output_register: AccountInfo<'info>,
        #[account(mut)]
        pub variance_cache: AccountInfo<'info>,
        pub risk_model_configuration: AccountInfo<'info>,
        pub risk_signer: Signer<'info>,
        pub clock: AccountInfo<'info>,
        pub covariance_metadata: AccountInfo<'info>,
        pub correlation_matrix: AccountInfo<'info>,
        #[account(mut)]
        pub mark_prices: AccountInfo<'info>,
    }
    #[automatically_derived]
    impl<'info> anchor_lang::Accounts<'info> for ValidateAccountLiquidation<'info>
    where
        'info: 'info,
    {
        #[inline(never)]
        fn try_accounts(
            program_id: &anchor_lang::solana_program::pubkey::Pubkey,
            accounts: &mut &[anchor_lang::solana_program::account_info::AccountInfo<
                'info,
            >],
            ix_data: &[u8],
            __bumps: &mut std::collections::BTreeMap<String, u8>,
        ) -> anchor_lang::Result<Self> {
            let market_product_group: AccountInfo = anchor_lang::Accounts::try_accounts(
                    program_id,
                    accounts,
                    ix_data,
                    __bumps,
                )
                .map_err(|e| e.with_account_name("market_product_group"))?;
            let trader_risk_group: AccountInfo = anchor_lang::Accounts::try_accounts(
                    program_id,
                    accounts,
                    ix_data,
                    __bumps,
                )
                .map_err(|e| e.with_account_name("trader_risk_group"))?;
            let risk_output_register: AccountInfo = anchor_lang::Accounts::try_accounts(
                    program_id,
                    accounts,
                    ix_data,
                    __bumps,
                )
                .map_err(|e| e.with_account_name("risk_output_register"))?;
            let variance_cache: AccountInfo = anchor_lang::Accounts::try_accounts(
                    program_id,
                    accounts,
                    ix_data,
                    __bumps,
                )
                .map_err(|e| e.with_account_name("variance_cache"))?;
            let risk_model_configuration: AccountInfo = anchor_lang::Accounts::try_accounts(
                    program_id,
                    accounts,
                    ix_data,
                    __bumps,
                )
                .map_err(|e| e.with_account_name("risk_model_configuration"))?;
            let risk_signer: Signer = anchor_lang::Accounts::try_accounts(
                    program_id,
                    accounts,
                    ix_data,
                    __bumps,
                )
                .map_err(|e| e.with_account_name("risk_signer"))?;
            let clock: AccountInfo = anchor_lang::Accounts::try_accounts(
                    program_id,
                    accounts,
                    ix_data,
                    __bumps,
                )
                .map_err(|e| e.with_account_name("clock"))?;
            let covariance_metadata: AccountInfo = anchor_lang::Accounts::try_accounts(
                    program_id,
                    accounts,
                    ix_data,
                    __bumps,
                )
                .map_err(|e| e.with_account_name("covariance_metadata"))?;
            let correlation_matrix: AccountInfo = anchor_lang::Accounts::try_accounts(
                    program_id,
                    accounts,
                    ix_data,
                    __bumps,
                )
                .map_err(|e| e.with_account_name("correlation_matrix"))?;
            let mark_prices: AccountInfo = anchor_lang::Accounts::try_accounts(
                    program_id,
                    accounts,
                    ix_data,
                    __bumps,
                )
                .map_err(|e| e.with_account_name("mark_prices"))?;
            if !risk_output_register.to_account_info().is_writable {
                return Err(
                    anchor_lang::error::Error::from(
                            anchor_lang::error::ErrorCode::ConstraintMut,
                        )
                        .with_account_name("risk_output_register"),
                );
            }
            if !variance_cache.to_account_info().is_writable {
                return Err(
                    anchor_lang::error::Error::from(
                            anchor_lang::error::ErrorCode::ConstraintMut,
                        )
                        .with_account_name("variance_cache"),
                );
            }
            if !mark_prices.to_account_info().is_writable {
                return Err(
                    anchor_lang::error::Error::from(
                            anchor_lang::error::ErrorCode::ConstraintMut,
                        )
                        .with_account_name("mark_prices"),
                );
            }
            Ok(ValidateAccountLiquidation {
                market_product_group,
                trader_risk_group,
                risk_output_register,
                variance_cache,
                risk_model_configuration,
                risk_signer,
                clock,
                covariance_metadata,
                correlation_matrix,
                mark_prices,
            })
        }
    }
    #[automatically_derived]
    impl<'info> anchor_lang::ToAccountInfos<'info> for ValidateAccountLiquidation<'info>
    where
        'info: 'info,
    {
        fn to_account_infos(
            &self,
        ) -> Vec<anchor_lang::solana_program::account_info::AccountInfo<'info>> {
            let mut account_infos = ::alloc::vec::Vec::new();
            account_infos.extend(self.market_product_group.to_account_infos());
            account_infos.extend(self.trader_risk_group.to_account_infos());
            account_infos.extend(self.risk_output_register.to_account_infos());
            account_infos.extend(self.variance_cache.to_account_infos());
            account_infos.extend(self.risk_model_configuration.to_account_infos());
            account_infos.extend(self.risk_signer.to_account_infos());
            account_infos.extend(self.clock.to_account_infos());
            account_infos.extend(self.covariance_metadata.to_account_infos());
            account_infos.extend(self.correlation_matrix.to_account_infos());
            account_infos.extend(self.mark_prices.to_account_infos());
            account_infos
        }
    }
    #[automatically_derived]
    impl<'info> anchor_lang::ToAccountMetas for ValidateAccountLiquidation<'info> {
        fn to_account_metas(
            &self,
            is_signer: Option<bool>,
        ) -> Vec<anchor_lang::solana_program::instruction::AccountMeta> {
            let mut account_metas = ::alloc::vec::Vec::new();
            account_metas.extend(self.market_product_group.to_account_metas(None));
            account_metas.extend(self.trader_risk_group.to_account_metas(None));
            account_metas.extend(self.risk_output_register.to_account_metas(None));
            account_metas.extend(self.variance_cache.to_account_metas(None));
            account_metas.extend(self.risk_model_configuration.to_account_metas(None));
            account_metas.extend(self.risk_signer.to_account_metas(None));
            account_metas.extend(self.clock.to_account_metas(None));
            account_metas.extend(self.covariance_metadata.to_account_metas(None));
            account_metas.extend(self.correlation_matrix.to_account_metas(None));
            account_metas.extend(self.mark_prices.to_account_metas(None));
            account_metas
        }
    }
    #[automatically_derived]
    impl<'info> anchor_lang::AccountsExit<'info> for ValidateAccountLiquidation<'info>
    where
        'info: 'info,
    {
        fn exit(
            &self,
            program_id: &anchor_lang::solana_program::pubkey::Pubkey,
        ) -> anchor_lang::Result<()> {
            anchor_lang::AccountsExit::exit(&self.risk_output_register, program_id)
                .map_err(|e| e.with_account_name("risk_output_register"))?;
            anchor_lang::AccountsExit::exit(&self.variance_cache, program_id)
                .map_err(|e| e.with_account_name("variance_cache"))?;
            anchor_lang::AccountsExit::exit(&self.mark_prices, program_id)
                .map_err(|e| e.with_account_name("mark_prices"))?;
            Ok(())
        }
    }
    /// An internal, Anchor generated module. This is used (as an
    /// implementation detail), to generate a struct for a given
    /// `#[derive(Accounts)]` implementation, where each field is a Pubkey,
    /// instead of an `AccountInfo`. This is useful for clients that want
    /// to generate a list of accounts, without explicitly knowing the
    /// order all the fields should be in.
    ///
    /// To access the struct in this module, one should use the sibling
    /// `accounts` module (also generated), which re-exports this.
    pub(crate) mod __client_accounts_validate_account_liquidation {
        use super::*;
        use anchor_lang::prelude::borsh;
        /// Generated client accounts for [`ValidateAccountLiquidation`].
        pub struct ValidateAccountLiquidation {
            pub market_product_group: anchor_lang::solana_program::pubkey::Pubkey,
            pub trader_risk_group: anchor_lang::solana_program::pubkey::Pubkey,
            pub risk_output_register: anchor_lang::solana_program::pubkey::Pubkey,
            pub variance_cache: anchor_lang::solana_program::pubkey::Pubkey,
            pub risk_model_configuration: anchor_lang::solana_program::pubkey::Pubkey,
            pub risk_signer: anchor_lang::solana_program::pubkey::Pubkey,
            pub clock: anchor_lang::solana_program::pubkey::Pubkey,
            pub covariance_metadata: anchor_lang::solana_program::pubkey::Pubkey,
            pub correlation_matrix: anchor_lang::solana_program::pubkey::Pubkey,
            pub mark_prices: anchor_lang::solana_program::pubkey::Pubkey,
        }
        impl borsh::ser::BorshSerialize for ValidateAccountLiquidation
        where
            anchor_lang::solana_program::pubkey::Pubkey: borsh::ser::BorshSerialize,
            anchor_lang::solana_program::pubkey::Pubkey: borsh::ser::BorshSerialize,
            anchor_lang::solana_program::pubkey::Pubkey: borsh::ser::BorshSerialize,
            anchor_lang::solana_program::pubkey::Pubkey: borsh::ser::BorshSerialize,
            anchor_lang::solana_program::pubkey::Pubkey: borsh::ser::BorshSerialize,
            anchor_lang::solana_program::pubkey::Pubkey: borsh::ser::BorshSerialize,
            anchor_lang::solana_program::pubkey::Pubkey: borsh::ser::BorshSerialize,
            anchor_lang::solana_program::pubkey::Pubkey: borsh::ser::BorshSerialize,
            anchor_lang::solana_program::pubkey::Pubkey: borsh::ser::BorshSerialize,
            anchor_lang::solana_program::pubkey::Pubkey: borsh::ser::BorshSerialize,
        {
            fn serialize<W: borsh::maybestd::io::Write>(
                &self,
                writer: &mut W,
            ) -> ::core::result::Result<(), borsh::maybestd::io::Error> {
                borsh::BorshSerialize::serialize(&self.market_product_group, writer)?;
                borsh::BorshSerialize::serialize(&self.trader_risk_group, writer)?;
                borsh::BorshSerialize::serialize(&self.risk_output_register, writer)?;
                borsh::BorshSerialize::serialize(&self.variance_cache, writer)?;
                borsh::BorshSerialize::serialize(
                    &self.risk_model_configuration,
                    writer,
                )?;
                borsh::BorshSerialize::serialize(&self.risk_signer, writer)?;
                borsh::BorshSerialize::serialize(&self.clock, writer)?;
                borsh::BorshSerialize::serialize(&self.covariance_metadata, writer)?;
                borsh::BorshSerialize::serialize(&self.correlation_matrix, writer)?;
                borsh::BorshSerialize::serialize(&self.mark_prices, writer)?;
                Ok(())
            }
        }
        #[automatically_derived]
        impl anchor_lang::ToAccountMetas for ValidateAccountLiquidation {
            fn to_account_metas(
                &self,
                is_signer: Option<bool>,
            ) -> Vec<anchor_lang::solana_program::instruction::AccountMeta> {
                let mut account_metas = ::alloc::vec::Vec::new();
                account_metas
                    .push(
                        anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                            self.market_product_group,
                            false,
                        ),
                    );
                account_metas
                    .push(
                        anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                            self.trader_risk_group,
                            false,
                        ),
                    );
                account_metas
                    .push(
                        anchor_lang::solana_program::instruction::AccountMeta::new(
                            self.risk_output_register,
                            false,
                        ),
                    );
                account_metas
                    .push(
                        anchor_lang::solana_program::instruction::AccountMeta::new(
                            self.variance_cache,
                            false,
                        ),
                    );
                account_metas
                    .push(
                        anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                            self.risk_model_configuration,
                            false,
                        ),
                    );
                account_metas
                    .push(
                        anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                            self.risk_signer,
                            true,
                        ),
                    );
                account_metas
                    .push(
                        anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                            self.clock,
                            false,
                        ),
                    );
                account_metas
                    .push(
                        anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                            self.covariance_metadata,
                            false,
                        ),
                    );
                account_metas
                    .push(
                        anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                            self.correlation_matrix,
                            false,
                        ),
                    );
                account_metas
                    .push(
                        anchor_lang::solana_program::instruction::AccountMeta::new(
                            self.mark_prices,
                            false,
                        ),
                    );
                account_metas
            }
        }
    }
    /// An internal, Anchor generated module. This is used (as an
    /// implementation detail), to generate a CPI struct for a given
    /// `#[derive(Accounts)]` implementation, where each field is an
    /// AccountInfo.
    ///
    /// To access the struct in this module, one should use the sibling
    /// [`cpi::accounts`] module (also generated), which re-exports this.
    pub(crate) mod __cpi_client_accounts_validate_account_liquidation {
        use super::*;
        /// Generated CPI struct of the accounts for [`ValidateAccountLiquidation`].
        pub struct ValidateAccountLiquidation<'info> {
            pub market_product_group: anchor_lang::solana_program::account_info::AccountInfo<
                'info,
            >,
            pub trader_risk_group: anchor_lang::solana_program::account_info::AccountInfo<
                'info,
            >,
            pub risk_output_register: anchor_lang::solana_program::account_info::AccountInfo<
                'info,
            >,
            pub variance_cache: anchor_lang::solana_program::account_info::AccountInfo<
                'info,
            >,
            pub risk_model_configuration: anchor_lang::solana_program::account_info::AccountInfo<
                'info,
            >,
            pub risk_signer: anchor_lang::solana_program::account_info::AccountInfo<
                'info,
            >,
            pub clock: anchor_lang::solana_program::account_info::AccountInfo<'info>,
            pub covariance_metadata: anchor_lang::solana_program::account_info::AccountInfo<
                'info,
            >,
            pub correlation_matrix: anchor_lang::solana_program::account_info::AccountInfo<
                'info,
            >,
            pub mark_prices: anchor_lang::solana_program::account_info::AccountInfo<
                'info,
            >,
        }
        #[automatically_derived]
        impl<'info> anchor_lang::ToAccountMetas for ValidateAccountLiquidation<'info> {
            fn to_account_metas(
                &self,
                is_signer: Option<bool>,
            ) -> Vec<anchor_lang::solana_program::instruction::AccountMeta> {
                let mut account_metas = ::alloc::vec::Vec::new();
                account_metas
                    .push(
                        anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                            anchor_lang::Key::key(&self.market_product_group),
                            false,
                        ),
                    );
                account_metas
                    .push(
                        anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                            anchor_lang::Key::key(&self.trader_risk_group),
                            false,
                        ),
                    );
                account_metas
                    .push(
                        anchor_lang::solana_program::instruction::AccountMeta::new(
                            anchor_lang::Key::key(&self.risk_output_register),
                            false,
                        ),
                    );
                account_metas
                    .push(
                        anchor_lang::solana_program::instruction::AccountMeta::new(
                            anchor_lang::Key::key(&self.variance_cache),
                            false,
                        ),
                    );
                account_metas
                    .push(
                        anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                            anchor_lang::Key::key(&self.risk_model_configuration),
                            false,
                        ),
                    );
                account_metas
                    .push(
                        anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                            anchor_lang::Key::key(&self.risk_signer),
                            true,
                        ),
                    );
                account_metas
                    .push(
                        anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                            anchor_lang::Key::key(&self.clock),
                            false,
                        ),
                    );
                account_metas
                    .push(
                        anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                            anchor_lang::Key::key(&self.covariance_metadata),
                            false,
                        ),
                    );
                account_metas
                    .push(
                        anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                            anchor_lang::Key::key(&self.correlation_matrix),
                            false,
                        ),
                    );
                account_metas
                    .push(
                        anchor_lang::solana_program::instruction::AccountMeta::new(
                            anchor_lang::Key::key(&self.mark_prices),
                            false,
                        ),
                    );
                account_metas
            }
        }
        #[automatically_derived]
        impl<'info> anchor_lang::ToAccountInfos<'info>
        for ValidateAccountLiquidation<'info> {
            fn to_account_infos(
                &self,
            ) -> Vec<anchor_lang::solana_program::account_info::AccountInfo<'info>> {
                let mut account_infos = ::alloc::vec::Vec::new();
                account_infos
                    .push(
                        anchor_lang::ToAccountInfo::to_account_info(
                            &self.market_product_group,
                        ),
                    );
                account_infos
                    .push(
                        anchor_lang::ToAccountInfo::to_account_info(
                            &self.trader_risk_group,
                        ),
                    );
                account_infos
                    .push(
                        anchor_lang::ToAccountInfo::to_account_info(
                            &self.risk_output_register,
                        ),
                    );
                account_infos
                    .push(
                        anchor_lang::ToAccountInfo::to_account_info(&self.variance_cache),
                    );
                account_infos
                    .push(
                        anchor_lang::ToAccountInfo::to_account_info(
                            &self.risk_model_configuration,
                        ),
                    );
                account_infos
                    .push(
                        anchor_lang::ToAccountInfo::to_account_info(&self.risk_signer),
                    );
                account_infos
                    .push(anchor_lang::ToAccountInfo::to_account_info(&self.clock));
                account_infos
                    .push(
                        anchor_lang::ToAccountInfo::to_account_info(
                            &self.covariance_metadata,
                        ),
                    );
                account_infos
                    .push(
                        anchor_lang::ToAccountInfo::to_account_info(
                            &self.correlation_matrix,
                        ),
                    );
                account_infos
                    .push(
                        anchor_lang::ToAccountInfo::to_account_info(&self.mark_prices),
                    );
                account_infos
            }
        }
    }
    pub struct CreateRiskStateAccount<'info> {
        #[account(mut)]
        pub payer: Signer<'info>,
        pub risk_signer: Signer<'info>,
        #[account(mut)]
        pub variance_cache: Signer<'info>,
        pub market_product_group: AccountInfo<'info>,
        pub system_program: AccountInfo<'info>,
    }
    #[automatically_derived]
    impl<'info> anchor_lang::Accounts<'info> for CreateRiskStateAccount<'info>
    where
        'info: 'info,
    {
        #[inline(never)]
        fn try_accounts(
            program_id: &anchor_lang::solana_program::pubkey::Pubkey,
            accounts: &mut &[anchor_lang::solana_program::account_info::AccountInfo<
                'info,
            >],
            ix_data: &[u8],
            __bumps: &mut std::collections::BTreeMap<String, u8>,
        ) -> anchor_lang::Result<Self> {
            let payer: Signer = anchor_lang::Accounts::try_accounts(
                    program_id,
                    accounts,
                    ix_data,
                    __bumps,
                )
                .map_err(|e| e.with_account_name("payer"))?;
            let risk_signer: Signer = anchor_lang::Accounts::try_accounts(
                    program_id,
                    accounts,
                    ix_data,
                    __bumps,
                )
                .map_err(|e| e.with_account_name("risk_signer"))?;
            let variance_cache: Signer = anchor_lang::Accounts::try_accounts(
                    program_id,
                    accounts,
                    ix_data,
                    __bumps,
                )
                .map_err(|e| e.with_account_name("variance_cache"))?;
            let market_product_group: AccountInfo = anchor_lang::Accounts::try_accounts(
                    program_id,
                    accounts,
                    ix_data,
                    __bumps,
                )
                .map_err(|e| e.with_account_name("market_product_group"))?;
            let system_program: AccountInfo = anchor_lang::Accounts::try_accounts(
                    program_id,
                    accounts,
                    ix_data,
                    __bumps,
                )
                .map_err(|e| e.with_account_name("system_program"))?;
            if !payer.to_account_info().is_writable {
                return Err(
                    anchor_lang::error::Error::from(
                            anchor_lang::error::ErrorCode::ConstraintMut,
                        )
                        .with_account_name("payer"),
                );
            }
            if !variance_cache.to_account_info().is_writable {
                return Err(
                    anchor_lang::error::Error::from(
                            anchor_lang::error::ErrorCode::ConstraintMut,
                        )
                        .with_account_name("variance_cache"),
                );
            }
            Ok(CreateRiskStateAccount {
                payer,
                risk_signer,
                variance_cache,
                market_product_group,
                system_program,
            })
        }
    }
    #[automatically_derived]
    impl<'info> anchor_lang::ToAccountInfos<'info> for CreateRiskStateAccount<'info>
    where
        'info: 'info,
    {
        fn to_account_infos(
            &self,
        ) -> Vec<anchor_lang::solana_program::account_info::AccountInfo<'info>> {
            let mut account_infos = ::alloc::vec::Vec::new();
            account_infos.extend(self.payer.to_account_infos());
            account_infos.extend(self.risk_signer.to_account_infos());
            account_infos.extend(self.variance_cache.to_account_infos());
            account_infos.extend(self.market_product_group.to_account_infos());
            account_infos.extend(self.system_program.to_account_infos());
            account_infos
        }
    }
    #[automatically_derived]
    impl<'info> anchor_lang::ToAccountMetas for CreateRiskStateAccount<'info> {
        fn to_account_metas(
            &self,
            is_signer: Option<bool>,
        ) -> Vec<anchor_lang::solana_program::instruction::AccountMeta> {
            let mut account_metas = ::alloc::vec::Vec::new();
            account_metas.extend(self.payer.to_account_metas(None));
            account_metas.extend(self.risk_signer.to_account_metas(None));
            account_metas.extend(self.variance_cache.to_account_metas(None));
            account_metas.extend(self.market_product_group.to_account_metas(None));
            account_metas.extend(self.system_program.to_account_metas(None));
            account_metas
        }
    }
    #[automatically_derived]
    impl<'info> anchor_lang::AccountsExit<'info> for CreateRiskStateAccount<'info>
    where
        'info: 'info,
    {
        fn exit(
            &self,
            program_id: &anchor_lang::solana_program::pubkey::Pubkey,
        ) -> anchor_lang::Result<()> {
            anchor_lang::AccountsExit::exit(&self.payer, program_id)
                .map_err(|e| e.with_account_name("payer"))?;
            anchor_lang::AccountsExit::exit(&self.variance_cache, program_id)
                .map_err(|e| e.with_account_name("variance_cache"))?;
            Ok(())
        }
    }
    /// An internal, Anchor generated module. This is used (as an
    /// implementation detail), to generate a struct for a given
    /// `#[derive(Accounts)]` implementation, where each field is a Pubkey,
    /// instead of an `AccountInfo`. This is useful for clients that want
    /// to generate a list of accounts, without explicitly knowing the
    /// order all the fields should be in.
    ///
    /// To access the struct in this module, one should use the sibling
    /// `accounts` module (also generated), which re-exports this.
    pub(crate) mod __client_accounts_create_risk_state_account {
        use super::*;
        use anchor_lang::prelude::borsh;
        /// Generated client accounts for [`CreateRiskStateAccount`].
        pub struct CreateRiskStateAccount {
            pub payer: anchor_lang::solana_program::pubkey::Pubkey,
            pub risk_signer: anchor_lang::solana_program::pubkey::Pubkey,
            pub variance_cache: anchor_lang::solana_program::pubkey::Pubkey,
            pub market_product_group: anchor_lang::solana_program::pubkey::Pubkey,
            pub system_program: anchor_lang::solana_program::pubkey::Pubkey,
        }
        impl borsh::ser::BorshSerialize for CreateRiskStateAccount
        where
            anchor_lang::solana_program::pubkey::Pubkey: borsh::ser::BorshSerialize,
            anchor_lang::solana_program::pubkey::Pubkey: borsh::ser::BorshSerialize,
            anchor_lang::solana_program::pubkey::Pubkey: borsh::ser::BorshSerialize,
            anchor_lang::solana_program::pubkey::Pubkey: borsh::ser::BorshSerialize,
            anchor_lang::solana_program::pubkey::Pubkey: borsh::ser::BorshSerialize,
        {
            fn serialize<W: borsh::maybestd::io::Write>(
                &self,
                writer: &mut W,
            ) -> ::core::result::Result<(), borsh::maybestd::io::Error> {
                borsh::BorshSerialize::serialize(&self.payer, writer)?;
                borsh::BorshSerialize::serialize(&self.risk_signer, writer)?;
                borsh::BorshSerialize::serialize(&self.variance_cache, writer)?;
                borsh::BorshSerialize::serialize(&self.market_product_group, writer)?;
                borsh::BorshSerialize::serialize(&self.system_program, writer)?;
                Ok(())
            }
        }
        #[automatically_derived]
        impl anchor_lang::ToAccountMetas for CreateRiskStateAccount {
            fn to_account_metas(
                &self,
                is_signer: Option<bool>,
            ) -> Vec<anchor_lang::solana_program::instruction::AccountMeta> {
                let mut account_metas = ::alloc::vec::Vec::new();
                account_metas
                    .push(
                        anchor_lang::solana_program::instruction::AccountMeta::new(
                            self.payer,
                            true,
                        ),
                    );
                account_metas
                    .push(
                        anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                            self.risk_signer,
                            true,
                        ),
                    );
                account_metas
                    .push(
                        anchor_lang::solana_program::instruction::AccountMeta::new(
                            self.variance_cache,
                            true,
                        ),
                    );
                account_metas
                    .push(
                        anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                            self.market_product_group,
                            false,
                        ),
                    );
                account_metas
                    .push(
                        anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                            self.system_program,
                            false,
                        ),
                    );
                account_metas
            }
        }
    }
    /// An internal, Anchor generated module. This is used (as an
    /// implementation detail), to generate a CPI struct for a given
    /// `#[derive(Accounts)]` implementation, where each field is an
    /// AccountInfo.
    ///
    /// To access the struct in this module, one should use the sibling
    /// [`cpi::accounts`] module (also generated), which re-exports this.
    pub(crate) mod __cpi_client_accounts_create_risk_state_account {
        use super::*;
        /// Generated CPI struct of the accounts for [`CreateRiskStateAccount`].
        pub struct CreateRiskStateAccount<'info> {
            pub payer: anchor_lang::solana_program::account_info::AccountInfo<'info>,
            pub risk_signer: anchor_lang::solana_program::account_info::AccountInfo<
                'info,
            >,
            pub variance_cache: anchor_lang::solana_program::account_info::AccountInfo<
                'info,
            >,
            pub market_product_group: anchor_lang::solana_program::account_info::AccountInfo<
                'info,
            >,
            pub system_program: anchor_lang::solana_program::account_info::AccountInfo<
                'info,
            >,
        }
        #[automatically_derived]
        impl<'info> anchor_lang::ToAccountMetas for CreateRiskStateAccount<'info> {
            fn to_account_metas(
                &self,
                is_signer: Option<bool>,
            ) -> Vec<anchor_lang::solana_program::instruction::AccountMeta> {
                let mut account_metas = ::alloc::vec::Vec::new();
                account_metas
                    .push(
                        anchor_lang::solana_program::instruction::AccountMeta::new(
                            anchor_lang::Key::key(&self.payer),
                            true,
                        ),
                    );
                account_metas
                    .push(
                        anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                            anchor_lang::Key::key(&self.risk_signer),
                            true,
                        ),
                    );
                account_metas
                    .push(
                        anchor_lang::solana_program::instruction::AccountMeta::new(
                            anchor_lang::Key::key(&self.variance_cache),
                            true,
                        ),
                    );
                account_metas
                    .push(
                        anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                            anchor_lang::Key::key(&self.market_product_group),
                            false,
                        ),
                    );
                account_metas
                    .push(
                        anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                            anchor_lang::Key::key(&self.system_program),
                            false,
                        ),
                    );
                account_metas
            }
        }
        #[automatically_derived]
        impl<'info> anchor_lang::ToAccountInfos<'info>
        for CreateRiskStateAccount<'info> {
            fn to_account_infos(
                &self,
            ) -> Vec<anchor_lang::solana_program::account_info::AccountInfo<'info>> {
                let mut account_infos = ::alloc::vec::Vec::new();
                account_infos
                    .push(anchor_lang::ToAccountInfo::to_account_info(&self.payer));
                account_infos
                    .push(
                        anchor_lang::ToAccountInfo::to_account_info(&self.risk_signer),
                    );
                account_infos
                    .push(
                        anchor_lang::ToAccountInfo::to_account_info(&self.variance_cache),
                    );
                account_infos
                    .push(
                        anchor_lang::ToAccountInfo::to_account_info(
                            &self.market_product_group,
                        ),
                    );
                account_infos
                    .push(
                        anchor_lang::ToAccountInfo::to_account_info(&self.system_program),
                    );
                account_infos
            }
        }
    }
    pub struct InitializeCovarianceMatrix<'info> {
        #[account(mut)]
        pub payer: Signer<'info>,
        pub authority: Signer<'info>,
        #[account(mut)]
        pub covariance_metadata: AccountInfo<'info>,
        #[account(mut)]
        pub correlation_matrix: AccountInfo<'info>,
        pub market_product_group: AccountInfo<'info>,
        pub system_program: AccountInfo<'info>,
    }
    #[automatically_derived]
    impl<'info> anchor_lang::Accounts<'info> for InitializeCovarianceMatrix<'info>
    where
        'info: 'info,
    {
        #[inline(never)]
        fn try_accounts(
            program_id: &anchor_lang::solana_program::pubkey::Pubkey,
            accounts: &mut &[anchor_lang::solana_program::account_info::AccountInfo<
                'info,
            >],
            ix_data: &[u8],
            __bumps: &mut std::collections::BTreeMap<String, u8>,
        ) -> anchor_lang::Result<Self> {
            let payer: Signer = anchor_lang::Accounts::try_accounts(
                    program_id,
                    accounts,
                    ix_data,
                    __bumps,
                )
                .map_err(|e| e.with_account_name("payer"))?;
            let authority: Signer = anchor_lang::Accounts::try_accounts(
                    program_id,
                    accounts,
                    ix_data,
                    __bumps,
                )
                .map_err(|e| e.with_account_name("authority"))?;
            let covariance_metadata: AccountInfo = anchor_lang::Accounts::try_accounts(
                    program_id,
                    accounts,
                    ix_data,
                    __bumps,
                )
                .map_err(|e| e.with_account_name("covariance_metadata"))?;
            let correlation_matrix: AccountInfo = anchor_lang::Accounts::try_accounts(
                    program_id,
                    accounts,
                    ix_data,
                    __bumps,
                )
                .map_err(|e| e.with_account_name("correlation_matrix"))?;
            let market_product_group: AccountInfo = anchor_lang::Accounts::try_accounts(
                    program_id,
                    accounts,
                    ix_data,
                    __bumps,
                )
                .map_err(|e| e.with_account_name("market_product_group"))?;
            let system_program: AccountInfo = anchor_lang::Accounts::try_accounts(
                    program_id,
                    accounts,
                    ix_data,
                    __bumps,
                )
                .map_err(|e| e.with_account_name("system_program"))?;
            if !payer.to_account_info().is_writable {
                return Err(
                    anchor_lang::error::Error::from(
                            anchor_lang::error::ErrorCode::ConstraintMut,
                        )
                        .with_account_name("payer"),
                );
            }
            if !covariance_metadata.to_account_info().is_writable {
                return Err(
                    anchor_lang::error::Error::from(
                            anchor_lang::error::ErrorCode::ConstraintMut,
                        )
                        .with_account_name("covariance_metadata"),
                );
            }
            if !correlation_matrix.to_account_info().is_writable {
                return Err(
                    anchor_lang::error::Error::from(
                            anchor_lang::error::ErrorCode::ConstraintMut,
                        )
                        .with_account_name("correlation_matrix"),
                );
            }
            Ok(InitializeCovarianceMatrix {
                payer,
                authority,
                covariance_metadata,
                correlation_matrix,
                market_product_group,
                system_program,
            })
        }
    }
    #[automatically_derived]
    impl<'info> anchor_lang::ToAccountInfos<'info> for InitializeCovarianceMatrix<'info>
    where
        'info: 'info,
    {
        fn to_account_infos(
            &self,
        ) -> Vec<anchor_lang::solana_program::account_info::AccountInfo<'info>> {
            let mut account_infos = ::alloc::vec::Vec::new();
            account_infos.extend(self.payer.to_account_infos());
            account_infos.extend(self.authority.to_account_infos());
            account_infos.extend(self.covariance_metadata.to_account_infos());
            account_infos.extend(self.correlation_matrix.to_account_infos());
            account_infos.extend(self.market_product_group.to_account_infos());
            account_infos.extend(self.system_program.to_account_infos());
            account_infos
        }
    }
    #[automatically_derived]
    impl<'info> anchor_lang::ToAccountMetas for InitializeCovarianceMatrix<'info> {
        fn to_account_metas(
            &self,
            is_signer: Option<bool>,
        ) -> Vec<anchor_lang::solana_program::instruction::AccountMeta> {
            let mut account_metas = ::alloc::vec::Vec::new();
            account_metas.extend(self.payer.to_account_metas(None));
            account_metas.extend(self.authority.to_account_metas(None));
            account_metas.extend(self.covariance_metadata.to_account_metas(None));
            account_metas.extend(self.correlation_matrix.to_account_metas(None));
            account_metas.extend(self.market_product_group.to_account_metas(None));
            account_metas.extend(self.system_program.to_account_metas(None));
            account_metas
        }
    }
    #[automatically_derived]
    impl<'info> anchor_lang::AccountsExit<'info> for InitializeCovarianceMatrix<'info>
    where
        'info: 'info,
    {
        fn exit(
            &self,
            program_id: &anchor_lang::solana_program::pubkey::Pubkey,
        ) -> anchor_lang::Result<()> {
            anchor_lang::AccountsExit::exit(&self.payer, program_id)
                .map_err(|e| e.with_account_name("payer"))?;
            anchor_lang::AccountsExit::exit(&self.covariance_metadata, program_id)
                .map_err(|e| e.with_account_name("covariance_metadata"))?;
            anchor_lang::AccountsExit::exit(&self.correlation_matrix, program_id)
                .map_err(|e| e.with_account_name("correlation_matrix"))?;
            Ok(())
        }
    }
    /// An internal, Anchor generated module. This is used (as an
    /// implementation detail), to generate a struct for a given
    /// `#[derive(Accounts)]` implementation, where each field is a Pubkey,
    /// instead of an `AccountInfo`. This is useful for clients that want
    /// to generate a list of accounts, without explicitly knowing the
    /// order all the fields should be in.
    ///
    /// To access the struct in this module, one should use the sibling
    /// `accounts` module (also generated), which re-exports this.
    pub(crate) mod __client_accounts_initialize_covariance_matrix {
        use super::*;
        use anchor_lang::prelude::borsh;
        /// Generated client accounts for [`InitializeCovarianceMatrix`].
        pub struct InitializeCovarianceMatrix {
            pub payer: anchor_lang::solana_program::pubkey::Pubkey,
            pub authority: anchor_lang::solana_program::pubkey::Pubkey,
            pub covariance_metadata: anchor_lang::solana_program::pubkey::Pubkey,
            pub correlation_matrix: anchor_lang::solana_program::pubkey::Pubkey,
            pub market_product_group: anchor_lang::solana_program::pubkey::Pubkey,
            pub system_program: anchor_lang::solana_program::pubkey::Pubkey,
        }
        impl borsh::ser::BorshSerialize for InitializeCovarianceMatrix
        where
            anchor_lang::solana_program::pubkey::Pubkey: borsh::ser::BorshSerialize,
            anchor_lang::solana_program::pubkey::Pubkey: borsh::ser::BorshSerialize,
            anchor_lang::solana_program::pubkey::Pubkey: borsh::ser::BorshSerialize,
            anchor_lang::solana_program::pubkey::Pubkey: borsh::ser::BorshSerialize,
            anchor_lang::solana_program::pubkey::Pubkey: borsh::ser::BorshSerialize,
            anchor_lang::solana_program::pubkey::Pubkey: borsh::ser::BorshSerialize,
        {
            fn serialize<W: borsh::maybestd::io::Write>(
                &self,
                writer: &mut W,
            ) -> ::core::result::Result<(), borsh::maybestd::io::Error> {
                borsh::BorshSerialize::serialize(&self.payer, writer)?;
                borsh::BorshSerialize::serialize(&self.authority, writer)?;
                borsh::BorshSerialize::serialize(&self.covariance_metadata, writer)?;
                borsh::BorshSerialize::serialize(&self.correlation_matrix, writer)?;
                borsh::BorshSerialize::serialize(&self.market_product_group, writer)?;
                borsh::BorshSerialize::serialize(&self.system_program, writer)?;
                Ok(())
            }
        }
        #[automatically_derived]
        impl anchor_lang::ToAccountMetas for InitializeCovarianceMatrix {
            fn to_account_metas(
                &self,
                is_signer: Option<bool>,
            ) -> Vec<anchor_lang::solana_program::instruction::AccountMeta> {
                let mut account_metas = ::alloc::vec::Vec::new();
                account_metas
                    .push(
                        anchor_lang::solana_program::instruction::AccountMeta::new(
                            self.payer,
                            true,
                        ),
                    );
                account_metas
                    .push(
                        anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                            self.authority,
                            true,
                        ),
                    );
                account_metas
                    .push(
                        anchor_lang::solana_program::instruction::AccountMeta::new(
                            self.covariance_metadata,
                            false,
                        ),
                    );
                account_metas
                    .push(
                        anchor_lang::solana_program::instruction::AccountMeta::new(
                            self.correlation_matrix,
                            false,
                        ),
                    );
                account_metas
                    .push(
                        anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                            self.market_product_group,
                            false,
                        ),
                    );
                account_metas
                    .push(
                        anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                            self.system_program,
                            false,
                        ),
                    );
                account_metas
            }
        }
    }
    /// An internal, Anchor generated module. This is used (as an
    /// implementation detail), to generate a CPI struct for a given
    /// `#[derive(Accounts)]` implementation, where each field is an
    /// AccountInfo.
    ///
    /// To access the struct in this module, one should use the sibling
    /// [`cpi::accounts`] module (also generated), which re-exports this.
    pub(crate) mod __cpi_client_accounts_initialize_covariance_matrix {
        use super::*;
        /// Generated CPI struct of the accounts for [`InitializeCovarianceMatrix`].
        pub struct InitializeCovarianceMatrix<'info> {
            pub payer: anchor_lang::solana_program::account_info::AccountInfo<'info>,
            pub authority: anchor_lang::solana_program::account_info::AccountInfo<'info>,
            pub covariance_metadata: anchor_lang::solana_program::account_info::AccountInfo<
                'info,
            >,
            pub correlation_matrix: anchor_lang::solana_program::account_info::AccountInfo<
                'info,
            >,
            pub market_product_group: anchor_lang::solana_program::account_info::AccountInfo<
                'info,
            >,
            pub system_program: anchor_lang::solana_program::account_info::AccountInfo<
                'info,
            >,
        }
        #[automatically_derived]
        impl<'info> anchor_lang::ToAccountMetas for InitializeCovarianceMatrix<'info> {
            fn to_account_metas(
                &self,
                is_signer: Option<bool>,
            ) -> Vec<anchor_lang::solana_program::instruction::AccountMeta> {
                let mut account_metas = ::alloc::vec::Vec::new();
                account_metas
                    .push(
                        anchor_lang::solana_program::instruction::AccountMeta::new(
                            anchor_lang::Key::key(&self.payer),
                            true,
                        ),
                    );
                account_metas
                    .push(
                        anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                            anchor_lang::Key::key(&self.authority),
                            true,
                        ),
                    );
                account_metas
                    .push(
                        anchor_lang::solana_program::instruction::AccountMeta::new(
                            anchor_lang::Key::key(&self.covariance_metadata),
                            false,
                        ),
                    );
                account_metas
                    .push(
                        anchor_lang::solana_program::instruction::AccountMeta::new(
                            anchor_lang::Key::key(&self.correlation_matrix),
                            false,
                        ),
                    );
                account_metas
                    .push(
                        anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                            anchor_lang::Key::key(&self.market_product_group),
                            false,
                        ),
                    );
                account_metas
                    .push(
                        anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                            anchor_lang::Key::key(&self.system_program),
                            false,
                        ),
                    );
                account_metas
            }
        }
        #[automatically_derived]
        impl<'info> anchor_lang::ToAccountInfos<'info>
        for InitializeCovarianceMatrix<'info> {
            fn to_account_infos(
                &self,
            ) -> Vec<anchor_lang::solana_program::account_info::AccountInfo<'info>> {
                let mut account_infos = ::alloc::vec::Vec::new();
                account_infos
                    .push(anchor_lang::ToAccountInfo::to_account_info(&self.payer));
                account_infos
                    .push(anchor_lang::ToAccountInfo::to_account_info(&self.authority));
                account_infos
                    .push(
                        anchor_lang::ToAccountInfo::to_account_info(
                            &self.covariance_metadata,
                        ),
                    );
                account_infos
                    .push(
                        anchor_lang::ToAccountInfo::to_account_info(
                            &self.correlation_matrix,
                        ),
                    );
                account_infos
                    .push(
                        anchor_lang::ToAccountInfo::to_account_info(
                            &self.market_product_group,
                        ),
                    );
                account_infos
                    .push(
                        anchor_lang::ToAccountInfo::to_account_info(&self.system_program),
                    );
                account_infos
            }
        }
    }
    pub struct UpdateCovarianceMatrix<'info> {
        pub authority: Signer<'info>,
        #[account(mut)]
        pub covariance_metadata: AccountInfo<'info>,
        #[account(mut)]
        pub correlation_matrix: AccountInfo<'info>,
        pub market_product_group: AccountInfo<'info>,
    }
    #[automatically_derived]
    impl<'info> anchor_lang::Accounts<'info> for UpdateCovarianceMatrix<'info>
    where
        'info: 'info,
    {
        #[inline(never)]
        fn try_accounts(
            program_id: &anchor_lang::solana_program::pubkey::Pubkey,
            accounts: &mut &[anchor_lang::solana_program::account_info::AccountInfo<
                'info,
            >],
            ix_data: &[u8],
            __bumps: &mut std::collections::BTreeMap<String, u8>,
        ) -> anchor_lang::Result<Self> {
            let authority: Signer = anchor_lang::Accounts::try_accounts(
                    program_id,
                    accounts,
                    ix_data,
                    __bumps,
                )
                .map_err(|e| e.with_account_name("authority"))?;
            let covariance_metadata: AccountInfo = anchor_lang::Accounts::try_accounts(
                    program_id,
                    accounts,
                    ix_data,
                    __bumps,
                )
                .map_err(|e| e.with_account_name("covariance_metadata"))?;
            let correlation_matrix: AccountInfo = anchor_lang::Accounts::try_accounts(
                    program_id,
                    accounts,
                    ix_data,
                    __bumps,
                )
                .map_err(|e| e.with_account_name("correlation_matrix"))?;
            let market_product_group: AccountInfo = anchor_lang::Accounts::try_accounts(
                    program_id,
                    accounts,
                    ix_data,
                    __bumps,
                )
                .map_err(|e| e.with_account_name("market_product_group"))?;
            if !covariance_metadata.to_account_info().is_writable {
                return Err(
                    anchor_lang::error::Error::from(
                            anchor_lang::error::ErrorCode::ConstraintMut,
                        )
                        .with_account_name("covariance_metadata"),
                );
            }
            if !correlation_matrix.to_account_info().is_writable {
                return Err(
                    anchor_lang::error::Error::from(
                            anchor_lang::error::ErrorCode::ConstraintMut,
                        )
                        .with_account_name("correlation_matrix"),
                );
            }
            Ok(UpdateCovarianceMatrix {
                authority,
                covariance_metadata,
                correlation_matrix,
                market_product_group,
            })
        }
    }
    #[automatically_derived]
    impl<'info> anchor_lang::ToAccountInfos<'info> for UpdateCovarianceMatrix<'info>
    where
        'info: 'info,
    {
        fn to_account_infos(
            &self,
        ) -> Vec<anchor_lang::solana_program::account_info::AccountInfo<'info>> {
            let mut account_infos = ::alloc::vec::Vec::new();
            account_infos.extend(self.authority.to_account_infos());
            account_infos.extend(self.covariance_metadata.to_account_infos());
            account_infos.extend(self.correlation_matrix.to_account_infos());
            account_infos.extend(self.market_product_group.to_account_infos());
            account_infos
        }
    }
    #[automatically_derived]
    impl<'info> anchor_lang::ToAccountMetas for UpdateCovarianceMatrix<'info> {
        fn to_account_metas(
            &self,
            is_signer: Option<bool>,
        ) -> Vec<anchor_lang::solana_program::instruction::AccountMeta> {
            let mut account_metas = ::alloc::vec::Vec::new();
            account_metas.extend(self.authority.to_account_metas(None));
            account_metas.extend(self.covariance_metadata.to_account_metas(None));
            account_metas.extend(self.correlation_matrix.to_account_metas(None));
            account_metas.extend(self.market_product_group.to_account_metas(None));
            account_metas
        }
    }
    #[automatically_derived]
    impl<'info> anchor_lang::AccountsExit<'info> for UpdateCovarianceMatrix<'info>
    where
        'info: 'info,
    {
        fn exit(
            &self,
            program_id: &anchor_lang::solana_program::pubkey::Pubkey,
        ) -> anchor_lang::Result<()> {
            anchor_lang::AccountsExit::exit(&self.covariance_metadata, program_id)
                .map_err(|e| e.with_account_name("covariance_metadata"))?;
            anchor_lang::AccountsExit::exit(&self.correlation_matrix, program_id)
                .map_err(|e| e.with_account_name("correlation_matrix"))?;
            Ok(())
        }
    }
    /// An internal, Anchor generated module. This is used (as an
    /// implementation detail), to generate a struct for a given
    /// `#[derive(Accounts)]` implementation, where each field is a Pubkey,
    /// instead of an `AccountInfo`. This is useful for clients that want
    /// to generate a list of accounts, without explicitly knowing the
    /// order all the fields should be in.
    ///
    /// To access the struct in this module, one should use the sibling
    /// `accounts` module (also generated), which re-exports this.
    pub(crate) mod __client_accounts_update_covariance_matrix {
        use super::*;
        use anchor_lang::prelude::borsh;
        /// Generated client accounts for [`UpdateCovarianceMatrix`].
        pub struct UpdateCovarianceMatrix {
            pub authority: anchor_lang::solana_program::pubkey::Pubkey,
            pub covariance_metadata: anchor_lang::solana_program::pubkey::Pubkey,
            pub correlation_matrix: anchor_lang::solana_program::pubkey::Pubkey,
            pub market_product_group: anchor_lang::solana_program::pubkey::Pubkey,
        }
        impl borsh::ser::BorshSerialize for UpdateCovarianceMatrix
        where
            anchor_lang::solana_program::pubkey::Pubkey: borsh::ser::BorshSerialize,
            anchor_lang::solana_program::pubkey::Pubkey: borsh::ser::BorshSerialize,
            anchor_lang::solana_program::pubkey::Pubkey: borsh::ser::BorshSerialize,
            anchor_lang::solana_program::pubkey::Pubkey: borsh::ser::BorshSerialize,
        {
            fn serialize<W: borsh::maybestd::io::Write>(
                &self,
                writer: &mut W,
            ) -> ::core::result::Result<(), borsh::maybestd::io::Error> {
                borsh::BorshSerialize::serialize(&self.authority, writer)?;
                borsh::BorshSerialize::serialize(&self.covariance_metadata, writer)?;
                borsh::BorshSerialize::serialize(&self.correlation_matrix, writer)?;
                borsh::BorshSerialize::serialize(&self.market_product_group, writer)?;
                Ok(())
            }
        }
        #[automatically_derived]
        impl anchor_lang::ToAccountMetas for UpdateCovarianceMatrix {
            fn to_account_metas(
                &self,
                is_signer: Option<bool>,
            ) -> Vec<anchor_lang::solana_program::instruction::AccountMeta> {
                let mut account_metas = ::alloc::vec::Vec::new();
                account_metas
                    .push(
                        anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                            self.authority,
                            true,
                        ),
                    );
                account_metas
                    .push(
                        anchor_lang::solana_program::instruction::AccountMeta::new(
                            self.covariance_metadata,
                            false,
                        ),
                    );
                account_metas
                    .push(
                        anchor_lang::solana_program::instruction::AccountMeta::new(
                            self.correlation_matrix,
                            false,
                        ),
                    );
                account_metas
                    .push(
                        anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                            self.market_product_group,
                            false,
                        ),
                    );
                account_metas
            }
        }
    }
    /// An internal, Anchor generated module. This is used (as an
    /// implementation detail), to generate a CPI struct for a given
    /// `#[derive(Accounts)]` implementation, where each field is an
    /// AccountInfo.
    ///
    /// To access the struct in this module, one should use the sibling
    /// [`cpi::accounts`] module (also generated), which re-exports this.
    pub(crate) mod __cpi_client_accounts_update_covariance_matrix {
        use super::*;
        /// Generated CPI struct of the accounts for [`UpdateCovarianceMatrix`].
        pub struct UpdateCovarianceMatrix<'info> {
            pub authority: anchor_lang::solana_program::account_info::AccountInfo<'info>,
            pub covariance_metadata: anchor_lang::solana_program::account_info::AccountInfo<
                'info,
            >,
            pub correlation_matrix: anchor_lang::solana_program::account_info::AccountInfo<
                'info,
            >,
            pub market_product_group: anchor_lang::solana_program::account_info::AccountInfo<
                'info,
            >,
        }
        #[automatically_derived]
        impl<'info> anchor_lang::ToAccountMetas for UpdateCovarianceMatrix<'info> {
            fn to_account_metas(
                &self,
                is_signer: Option<bool>,
            ) -> Vec<anchor_lang::solana_program::instruction::AccountMeta> {
                let mut account_metas = ::alloc::vec::Vec::new();
                account_metas
                    .push(
                        anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                            anchor_lang::Key::key(&self.authority),
                            true,
                        ),
                    );
                account_metas
                    .push(
                        anchor_lang::solana_program::instruction::AccountMeta::new(
                            anchor_lang::Key::key(&self.covariance_metadata),
                            false,
                        ),
                    );
                account_metas
                    .push(
                        anchor_lang::solana_program::instruction::AccountMeta::new(
                            anchor_lang::Key::key(&self.correlation_matrix),
                            false,
                        ),
                    );
                account_metas
                    .push(
                        anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                            anchor_lang::Key::key(&self.market_product_group),
                            false,
                        ),
                    );
                account_metas
            }
        }
        #[automatically_derived]
        impl<'info> anchor_lang::ToAccountInfos<'info>
        for UpdateCovarianceMatrix<'info> {
            fn to_account_infos(
                &self,
            ) -> Vec<anchor_lang::solana_program::account_info::AccountInfo<'info>> {
                let mut account_infos = ::alloc::vec::Vec::new();
                account_infos
                    .push(anchor_lang::ToAccountInfo::to_account_info(&self.authority));
                account_infos
                    .push(
                        anchor_lang::ToAccountInfo::to_account_info(
                            &self.covariance_metadata,
                        ),
                    );
                account_infos
                    .push(
                        anchor_lang::ToAccountInfo::to_account_info(
                            &self.correlation_matrix,
                        ),
                    );
                account_infos
                    .push(
                        anchor_lang::ToAccountInfo::to_account_info(
                            &self.market_product_group,
                        ),
                    );
                account_infos
            }
        }
    }
    pub struct InitializeMarkPrices<'info> {
        #[account(mut)]
        pub payer: Signer<'info>,
        pub authority: Signer<'info>,
        #[account(mut)]
        pub mark_prices: AccountInfo<'info>,
        pub market_product_group: AccountInfo<'info>,
        pub clock: AccountInfo<'info>,
        pub system_program: AccountInfo<'info>,
    }
    #[automatically_derived]
    impl<'info> anchor_lang::Accounts<'info> for InitializeMarkPrices<'info>
    where
        'info: 'info,
    {
        #[inline(never)]
        fn try_accounts(
            program_id: &anchor_lang::solana_program::pubkey::Pubkey,
            accounts: &mut &[anchor_lang::solana_program::account_info::AccountInfo<
                'info,
            >],
            ix_data: &[u8],
            __bumps: &mut std::collections::BTreeMap<String, u8>,
        ) -> anchor_lang::Result<Self> {
            let payer: Signer = anchor_lang::Accounts::try_accounts(
                    program_id,
                    accounts,
                    ix_data,
                    __bumps,
                )
                .map_err(|e| e.with_account_name("payer"))?;
            let authority: Signer = anchor_lang::Accounts::try_accounts(
                    program_id,
                    accounts,
                    ix_data,
                    __bumps,
                )
                .map_err(|e| e.with_account_name("authority"))?;
            let mark_prices: AccountInfo = anchor_lang::Accounts::try_accounts(
                    program_id,
                    accounts,
                    ix_data,
                    __bumps,
                )
                .map_err(|e| e.with_account_name("mark_prices"))?;
            let market_product_group: AccountInfo = anchor_lang::Accounts::try_accounts(
                    program_id,
                    accounts,
                    ix_data,
                    __bumps,
                )
                .map_err(|e| e.with_account_name("market_product_group"))?;
            let clock: AccountInfo = anchor_lang::Accounts::try_accounts(
                    program_id,
                    accounts,
                    ix_data,
                    __bumps,
                )
                .map_err(|e| e.with_account_name("clock"))?;
            let system_program: AccountInfo = anchor_lang::Accounts::try_accounts(
                    program_id,
                    accounts,
                    ix_data,
                    __bumps,
                )
                .map_err(|e| e.with_account_name("system_program"))?;
            if !payer.to_account_info().is_writable {
                return Err(
                    anchor_lang::error::Error::from(
                            anchor_lang::error::ErrorCode::ConstraintMut,
                        )
                        .with_account_name("payer"),
                );
            }
            if !mark_prices.to_account_info().is_writable {
                return Err(
                    anchor_lang::error::Error::from(
                            anchor_lang::error::ErrorCode::ConstraintMut,
                        )
                        .with_account_name("mark_prices"),
                );
            }
            Ok(InitializeMarkPrices {
                payer,
                authority,
                mark_prices,
                market_product_group,
                clock,
                system_program,
            })
        }
    }
    #[automatically_derived]
    impl<'info> anchor_lang::ToAccountInfos<'info> for InitializeMarkPrices<'info>
    where
        'info: 'info,
    {
        fn to_account_infos(
            &self,
        ) -> Vec<anchor_lang::solana_program::account_info::AccountInfo<'info>> {
            let mut account_infos = ::alloc::vec::Vec::new();
            account_infos.extend(self.payer.to_account_infos());
            account_infos.extend(self.authority.to_account_infos());
            account_infos.extend(self.mark_prices.to_account_infos());
            account_infos.extend(self.market_product_group.to_account_infos());
            account_infos.extend(self.clock.to_account_infos());
            account_infos.extend(self.system_program.to_account_infos());
            account_infos
        }
    }
    #[automatically_derived]
    impl<'info> anchor_lang::ToAccountMetas for InitializeMarkPrices<'info> {
        fn to_account_metas(
            &self,
            is_signer: Option<bool>,
        ) -> Vec<anchor_lang::solana_program::instruction::AccountMeta> {
            let mut account_metas = ::alloc::vec::Vec::new();
            account_metas.extend(self.payer.to_account_metas(None));
            account_metas.extend(self.authority.to_account_metas(None));
            account_metas.extend(self.mark_prices.to_account_metas(None));
            account_metas.extend(self.market_product_group.to_account_metas(None));
            account_metas.extend(self.clock.to_account_metas(None));
            account_metas.extend(self.system_program.to_account_metas(None));
            account_metas
        }
    }
    #[automatically_derived]
    impl<'info> anchor_lang::AccountsExit<'info> for InitializeMarkPrices<'info>
    where
        'info: 'info,
    {
        fn exit(
            &self,
            program_id: &anchor_lang::solana_program::pubkey::Pubkey,
        ) -> anchor_lang::Result<()> {
            anchor_lang::AccountsExit::exit(&self.payer, program_id)
                .map_err(|e| e.with_account_name("payer"))?;
            anchor_lang::AccountsExit::exit(&self.mark_prices, program_id)
                .map_err(|e| e.with_account_name("mark_prices"))?;
            Ok(())
        }
    }
    /// An internal, Anchor generated module. This is used (as an
    /// implementation detail), to generate a struct for a given
    /// `#[derive(Accounts)]` implementation, where each field is a Pubkey,
    /// instead of an `AccountInfo`. This is useful for clients that want
    /// to generate a list of accounts, without explicitly knowing the
    /// order all the fields should be in.
    ///
    /// To access the struct in this module, one should use the sibling
    /// `accounts` module (also generated), which re-exports this.
    pub(crate) mod __client_accounts_initialize_mark_prices {
        use super::*;
        use anchor_lang::prelude::borsh;
        /// Generated client accounts for [`InitializeMarkPrices`].
        pub struct InitializeMarkPrices {
            pub payer: anchor_lang::solana_program::pubkey::Pubkey,
            pub authority: anchor_lang::solana_program::pubkey::Pubkey,
            pub mark_prices: anchor_lang::solana_program::pubkey::Pubkey,
            pub market_product_group: anchor_lang::solana_program::pubkey::Pubkey,
            pub clock: anchor_lang::solana_program::pubkey::Pubkey,
            pub system_program: anchor_lang::solana_program::pubkey::Pubkey,
        }
        impl borsh::ser::BorshSerialize for InitializeMarkPrices
        where
            anchor_lang::solana_program::pubkey::Pubkey: borsh::ser::BorshSerialize,
            anchor_lang::solana_program::pubkey::Pubkey: borsh::ser::BorshSerialize,
            anchor_lang::solana_program::pubkey::Pubkey: borsh::ser::BorshSerialize,
            anchor_lang::solana_program::pubkey::Pubkey: borsh::ser::BorshSerialize,
            anchor_lang::solana_program::pubkey::Pubkey: borsh::ser::BorshSerialize,
            anchor_lang::solana_program::pubkey::Pubkey: borsh::ser::BorshSerialize,
        {
            fn serialize<W: borsh::maybestd::io::Write>(
                &self,
                writer: &mut W,
            ) -> ::core::result::Result<(), borsh::maybestd::io::Error> {
                borsh::BorshSerialize::serialize(&self.payer, writer)?;
                borsh::BorshSerialize::serialize(&self.authority, writer)?;
                borsh::BorshSerialize::serialize(&self.mark_prices, writer)?;
                borsh::BorshSerialize::serialize(&self.market_product_group, writer)?;
                borsh::BorshSerialize::serialize(&self.clock, writer)?;
                borsh::BorshSerialize::serialize(&self.system_program, writer)?;
                Ok(())
            }
        }
        #[automatically_derived]
        impl anchor_lang::ToAccountMetas for InitializeMarkPrices {
            fn to_account_metas(
                &self,
                is_signer: Option<bool>,
            ) -> Vec<anchor_lang::solana_program::instruction::AccountMeta> {
                let mut account_metas = ::alloc::vec::Vec::new();
                account_metas
                    .push(
                        anchor_lang::solana_program::instruction::AccountMeta::new(
                            self.payer,
                            true,
                        ),
                    );
                account_metas
                    .push(
                        anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                            self.authority,
                            true,
                        ),
                    );
                account_metas
                    .push(
                        anchor_lang::solana_program::instruction::AccountMeta::new(
                            self.mark_prices,
                            false,
                        ),
                    );
                account_metas
                    .push(
                        anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                            self.market_product_group,
                            false,
                        ),
                    );
                account_metas
                    .push(
                        anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                            self.clock,
                            false,
                        ),
                    );
                account_metas
                    .push(
                        anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                            self.system_program,
                            false,
                        ),
                    );
                account_metas
            }
        }
    }
    /// An internal, Anchor generated module. This is used (as an
    /// implementation detail), to generate a CPI struct for a given
    /// `#[derive(Accounts)]` implementation, where each field is an
    /// AccountInfo.
    ///
    /// To access the struct in this module, one should use the sibling
    /// [`cpi::accounts`] module (also generated), which re-exports this.
    pub(crate) mod __cpi_client_accounts_initialize_mark_prices {
        use super::*;
        /// Generated CPI struct of the accounts for [`InitializeMarkPrices`].
        pub struct InitializeMarkPrices<'info> {
            pub payer: anchor_lang::solana_program::account_info::AccountInfo<'info>,
            pub authority: anchor_lang::solana_program::account_info::AccountInfo<'info>,
            pub mark_prices: anchor_lang::solana_program::account_info::AccountInfo<
                'info,
            >,
            pub market_product_group: anchor_lang::solana_program::account_info::AccountInfo<
                'info,
            >,
            pub clock: anchor_lang::solana_program::account_info::AccountInfo<'info>,
            pub system_program: anchor_lang::solana_program::account_info::AccountInfo<
                'info,
            >,
        }
        #[automatically_derived]
        impl<'info> anchor_lang::ToAccountMetas for InitializeMarkPrices<'info> {
            fn to_account_metas(
                &self,
                is_signer: Option<bool>,
            ) -> Vec<anchor_lang::solana_program::instruction::AccountMeta> {
                let mut account_metas = ::alloc::vec::Vec::new();
                account_metas
                    .push(
                        anchor_lang::solana_program::instruction::AccountMeta::new(
                            anchor_lang::Key::key(&self.payer),
                            true,
                        ),
                    );
                account_metas
                    .push(
                        anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                            anchor_lang::Key::key(&self.authority),
                            true,
                        ),
                    );
                account_metas
                    .push(
                        anchor_lang::solana_program::instruction::AccountMeta::new(
                            anchor_lang::Key::key(&self.mark_prices),
                            false,
                        ),
                    );
                account_metas
                    .push(
                        anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                            anchor_lang::Key::key(&self.market_product_group),
                            false,
                        ),
                    );
                account_metas
                    .push(
                        anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                            anchor_lang::Key::key(&self.clock),
                            false,
                        ),
                    );
                account_metas
                    .push(
                        anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                            anchor_lang::Key::key(&self.system_program),
                            false,
                        ),
                    );
                account_metas
            }
        }
        #[automatically_derived]
        impl<'info> anchor_lang::ToAccountInfos<'info> for InitializeMarkPrices<'info> {
            fn to_account_infos(
                &self,
            ) -> Vec<anchor_lang::solana_program::account_info::AccountInfo<'info>> {
                let mut account_infos = ::alloc::vec::Vec::new();
                account_infos
                    .push(anchor_lang::ToAccountInfo::to_account_info(&self.payer));
                account_infos
                    .push(anchor_lang::ToAccountInfo::to_account_info(&self.authority));
                account_infos
                    .push(
                        anchor_lang::ToAccountInfo::to_account_info(&self.mark_prices),
                    );
                account_infos
                    .push(
                        anchor_lang::ToAccountInfo::to_account_info(
                            &self.market_product_group,
                        ),
                    );
                account_infos
                    .push(anchor_lang::ToAccountInfo::to_account_info(&self.clock));
                account_infos
                    .push(
                        anchor_lang::ToAccountInfo::to_account_info(&self.system_program),
                    );
                account_infos
            }
        }
    }
    pub struct UpdateMarkPrices<'info> {
        #[account(mut)]
        pub payer: Signer<'info>,
        #[account(mut)]
        pub mark_prices: AccountInfo<'info>,
        pub market_product_group: AccountInfo<'info>,
        pub clock: AccountInfo<'info>,
    }
    #[automatically_derived]
    impl<'info> anchor_lang::Accounts<'info> for UpdateMarkPrices<'info>
    where
        'info: 'info,
    {
        #[inline(never)]
        fn try_accounts(
            program_id: &anchor_lang::solana_program::pubkey::Pubkey,
            accounts: &mut &[anchor_lang::solana_program::account_info::AccountInfo<
                'info,
            >],
            ix_data: &[u8],
            __bumps: &mut std::collections::BTreeMap<String, u8>,
        ) -> anchor_lang::Result<Self> {
            let payer: Signer = anchor_lang::Accounts::try_accounts(
                    program_id,
                    accounts,
                    ix_data,
                    __bumps,
                )
                .map_err(|e| e.with_account_name("payer"))?;
            let mark_prices: AccountInfo = anchor_lang::Accounts::try_accounts(
                    program_id,
                    accounts,
                    ix_data,
                    __bumps,
                )
                .map_err(|e| e.with_account_name("mark_prices"))?;
            let market_product_group: AccountInfo = anchor_lang::Accounts::try_accounts(
                    program_id,
                    accounts,
                    ix_data,
                    __bumps,
                )
                .map_err(|e| e.with_account_name("market_product_group"))?;
            let clock: AccountInfo = anchor_lang::Accounts::try_accounts(
                    program_id,
                    accounts,
                    ix_data,
                    __bumps,
                )
                .map_err(|e| e.with_account_name("clock"))?;
            if !payer.to_account_info().is_writable {
                return Err(
                    anchor_lang::error::Error::from(
                            anchor_lang::error::ErrorCode::ConstraintMut,
                        )
                        .with_account_name("payer"),
                );
            }
            if !mark_prices.to_account_info().is_writable {
                return Err(
                    anchor_lang::error::Error::from(
                            anchor_lang::error::ErrorCode::ConstraintMut,
                        )
                        .with_account_name("mark_prices"),
                );
            }
            Ok(UpdateMarkPrices {
                payer,
                mark_prices,
                market_product_group,
                clock,
            })
        }
    }
    #[automatically_derived]
    impl<'info> anchor_lang::ToAccountInfos<'info> for UpdateMarkPrices<'info>
    where
        'info: 'info,
    {
        fn to_account_infos(
            &self,
        ) -> Vec<anchor_lang::solana_program::account_info::AccountInfo<'info>> {
            let mut account_infos = ::alloc::vec::Vec::new();
            account_infos.extend(self.payer.to_account_infos());
            account_infos.extend(self.mark_prices.to_account_infos());
            account_infos.extend(self.market_product_group.to_account_infos());
            account_infos.extend(self.clock.to_account_infos());
            account_infos
        }
    }
    #[automatically_derived]
    impl<'info> anchor_lang::ToAccountMetas for UpdateMarkPrices<'info> {
        fn to_account_metas(
            &self,
            is_signer: Option<bool>,
        ) -> Vec<anchor_lang::solana_program::instruction::AccountMeta> {
            let mut account_metas = ::alloc::vec::Vec::new();
            account_metas.extend(self.payer.to_account_metas(None));
            account_metas.extend(self.mark_prices.to_account_metas(None));
            account_metas.extend(self.market_product_group.to_account_metas(None));
            account_metas.extend(self.clock.to_account_metas(None));
            account_metas
        }
    }
    #[automatically_derived]
    impl<'info> anchor_lang::AccountsExit<'info> for UpdateMarkPrices<'info>
    where
        'info: 'info,
    {
        fn exit(
            &self,
            program_id: &anchor_lang::solana_program::pubkey::Pubkey,
        ) -> anchor_lang::Result<()> {
            anchor_lang::AccountsExit::exit(&self.payer, program_id)
                .map_err(|e| e.with_account_name("payer"))?;
            anchor_lang::AccountsExit::exit(&self.mark_prices, program_id)
                .map_err(|e| e.with_account_name("mark_prices"))?;
            Ok(())
        }
    }
    /// An internal, Anchor generated module. This is used (as an
    /// implementation detail), to generate a struct for a given
    /// `#[derive(Accounts)]` implementation, where each field is a Pubkey,
    /// instead of an `AccountInfo`. This is useful for clients that want
    /// to generate a list of accounts, without explicitly knowing the
    /// order all the fields should be in.
    ///
    /// To access the struct in this module, one should use the sibling
    /// `accounts` module (also generated), which re-exports this.
    pub(crate) mod __client_accounts_update_mark_prices {
        use super::*;
        use anchor_lang::prelude::borsh;
        /// Generated client accounts for [`UpdateMarkPrices`].
        pub struct UpdateMarkPrices {
            pub payer: anchor_lang::solana_program::pubkey::Pubkey,
            pub mark_prices: anchor_lang::solana_program::pubkey::Pubkey,
            pub market_product_group: anchor_lang::solana_program::pubkey::Pubkey,
            pub clock: anchor_lang::solana_program::pubkey::Pubkey,
        }
        impl borsh::ser::BorshSerialize for UpdateMarkPrices
        where
            anchor_lang::solana_program::pubkey::Pubkey: borsh::ser::BorshSerialize,
            anchor_lang::solana_program::pubkey::Pubkey: borsh::ser::BorshSerialize,
            anchor_lang::solana_program::pubkey::Pubkey: borsh::ser::BorshSerialize,
            anchor_lang::solana_program::pubkey::Pubkey: borsh::ser::BorshSerialize,
        {
            fn serialize<W: borsh::maybestd::io::Write>(
                &self,
                writer: &mut W,
            ) -> ::core::result::Result<(), borsh::maybestd::io::Error> {
                borsh::BorshSerialize::serialize(&self.payer, writer)?;
                borsh::BorshSerialize::serialize(&self.mark_prices, writer)?;
                borsh::BorshSerialize::serialize(&self.market_product_group, writer)?;
                borsh::BorshSerialize::serialize(&self.clock, writer)?;
                Ok(())
            }
        }
        #[automatically_derived]
        impl anchor_lang::ToAccountMetas for UpdateMarkPrices {
            fn to_account_metas(
                &self,
                is_signer: Option<bool>,
            ) -> Vec<anchor_lang::solana_program::instruction::AccountMeta> {
                let mut account_metas = ::alloc::vec::Vec::new();
                account_metas
                    .push(
                        anchor_lang::solana_program::instruction::AccountMeta::new(
                            self.payer,
                            true,
                        ),
                    );
                account_metas
                    .push(
                        anchor_lang::solana_program::instruction::AccountMeta::new(
                            self.mark_prices,
                            false,
                        ),
                    );
                account_metas
                    .push(
                        anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                            self.market_product_group,
                            false,
                        ),
                    );
                account_metas
                    .push(
                        anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                            self.clock,
                            false,
                        ),
                    );
                account_metas
            }
        }
    }
    /// An internal, Anchor generated module. This is used (as an
    /// implementation detail), to generate a CPI struct for a given
    /// `#[derive(Accounts)]` implementation, where each field is an
    /// AccountInfo.
    ///
    /// To access the struct in this module, one should use the sibling
    /// [`cpi::accounts`] module (also generated), which re-exports this.
    pub(crate) mod __cpi_client_accounts_update_mark_prices {
        use super::*;
        /// Generated CPI struct of the accounts for [`UpdateMarkPrices`].
        pub struct UpdateMarkPrices<'info> {
            pub payer: anchor_lang::solana_program::account_info::AccountInfo<'info>,
            pub mark_prices: anchor_lang::solana_program::account_info::AccountInfo<
                'info,
            >,
            pub market_product_group: anchor_lang::solana_program::account_info::AccountInfo<
                'info,
            >,
            pub clock: anchor_lang::solana_program::account_info::AccountInfo<'info>,
        }
        #[automatically_derived]
        impl<'info> anchor_lang::ToAccountMetas for UpdateMarkPrices<'info> {
            fn to_account_metas(
                &self,
                is_signer: Option<bool>,
            ) -> Vec<anchor_lang::solana_program::instruction::AccountMeta> {
                let mut account_metas = ::alloc::vec::Vec::new();
                account_metas
                    .push(
                        anchor_lang::solana_program::instruction::AccountMeta::new(
                            anchor_lang::Key::key(&self.payer),
                            true,
                        ),
                    );
                account_metas
                    .push(
                        anchor_lang::solana_program::instruction::AccountMeta::new(
                            anchor_lang::Key::key(&self.mark_prices),
                            false,
                        ),
                    );
                account_metas
                    .push(
                        anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                            anchor_lang::Key::key(&self.market_product_group),
                            false,
                        ),
                    );
                account_metas
                    .push(
                        anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                            anchor_lang::Key::key(&self.clock),
                            false,
                        ),
                    );
                account_metas
            }
        }
        #[automatically_derived]
        impl<'info> anchor_lang::ToAccountInfos<'info> for UpdateMarkPrices<'info> {
            fn to_account_infos(
                &self,
            ) -> Vec<anchor_lang::solana_program::account_info::AccountInfo<'info>> {
                let mut account_infos = ::alloc::vec::Vec::new();
                account_infos
                    .push(anchor_lang::ToAccountInfo::to_account_info(&self.payer));
                account_infos
                    .push(
                        anchor_lang::ToAccountInfo::to_account_info(&self.mark_prices),
                    );
                account_infos
                    .push(
                        anchor_lang::ToAccountInfo::to_account_info(
                            &self.market_product_group,
                        ),
                    );
                account_infos
                    .push(anchor_lang::ToAccountInfo::to_account_info(&self.clock));
                account_infos
            }
        }
    }
}
use ix_accounts::*;
pub use state::*;
pub use typedefs::*;
use self::risk_engine_program::*;
/// The Anchor codegen exposes a programming model where a user defines
/// a set of methods inside of a `#[program]` module in a way similar
/// to writing RPC request handlers. The macro then generates a bunch of
/// code wrapping these user defined methods into something that can be
/// executed on Solana.
///
/// These methods fall into one of three categories, each of which
/// can be considered a different "namespace" of the program.
///
/// 1) Global methods - regular methods inside of the `#[program]`.
/// 2) State methods - associated methods inside a `#[state]` struct.
/// 3) Interface methods - methods inside a strait struct's
///    implementation of an `#[interface]` trait.
///
/// Care must be taken by the codegen to prevent collisions between
/// methods in these different namespaces. For this reason, Anchor uses
/// a variant of sighash to perform method dispatch, rather than
/// something like a simple enum variant discriminator.
///
/// The execution flow of the generated code can be roughly outlined:
///
/// * Start program via the entrypoint.
/// * Strip method identifier off the first 8 bytes of the instruction
///   data and invoke the identified method. The method identifier
///   is a variant of sighash. See docs.rs for `anchor_lang` for details.
/// * If the method identifier is an IDL identifier, execute the IDL
///   instructions, which are a special set of hardcoded instructions
///   baked into every Anchor program. Then exit.
/// * Otherwise, the method identifier is for a user defined
///   instruction, i.e., one of the methods in the user defined
///   `#[program]` module. Perform method dispatch, i.e., execute the
///   big match statement mapping method identifier to method handler
///   wrapper.
/// * Run the method handler wrapper. This wraps the code the user
///   actually wrote, deserializing the accounts, constructing the
///   context, invoking the user's code, and finally running the exit
///   routine, which typically persists account changes.
///
/// The `entry` function here, defines the standard entry to a Solana
/// program, where execution begins.
pub fn entry(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    data: &[u8],
) -> anchor_lang::solana_program::entrypoint::ProgramResult {
    try_entry(program_id, accounts, data)
        .map_err(|e| {
            e.log();
            e.into()
        })
}
fn try_entry(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    data: &[u8],
) -> anchor_lang::Result<()> {
    if *program_id != ID {
        return Err(anchor_lang::error::ErrorCode::DeclaredProgramIdMismatch.into());
    }
    if data.len() < 8 {
        return Err(anchor_lang::error::ErrorCode::InstructionMissing.into());
    }
    dispatch(program_id, accounts, data)
}
/// Module representing the program.
pub mod program {
    use super::*;
    /// Type representing the program.
    pub struct RiskEngineProgram;
    #[automatically_derived]
    impl ::core::clone::Clone for RiskEngineProgram {
        #[inline]
        fn clone(&self) -> RiskEngineProgram {
            RiskEngineProgram
        }
    }
    impl anchor_lang::Id for RiskEngineProgram {
        fn id() -> Pubkey {
            ID
        }
    }
}
/// Performs method dispatch.
///
/// Each method in an anchor program is uniquely defined by a namespace
/// and a rust identifier (i.e., the name given to the method). These
/// two pieces can be combined to creater a method identifier,
/// specifically, Anchor uses
///
/// Sha256("<namespace>::<rust-identifier>")[..8],
///
/// where the namespace can be one of three types. 1) "global" for a
/// regular instruction, 2) "state" for a state struct instruction
/// handler and 3) a trait namespace (used in combination with the
/// `#[interface]` attribute), which is defined by the trait name, e..
/// `MyTrait`.
///
/// With this 8 byte identifier, Anchor performs method dispatch,
/// matching the given 8 byte identifier to the associated method
/// handler, which leads to user defined code being eventually invoked.
fn dispatch(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    data: &[u8],
) -> anchor_lang::Result<()> {
    let mut ix_data: &[u8] = data;
    let sighash: [u8; 8] = {
        let mut sighash: [u8; 8] = [0; 8];
        sighash.copy_from_slice(&ix_data[..8]);
        ix_data = &ix_data[8..];
        sighash
    };
    if true {
        if sighash == anchor_lang::idl::IDL_IX_TAG.to_le_bytes() {
            return __private::__idl::__idl_dispatch(program_id, accounts, &ix_data);
        }
    }
    match sighash {
        [39, 180, 199, 236, 99, 54, 132, 232] => {
            __private::__global::validate_account_health(program_id, accounts, ix_data)
        }
        [48, 105, 196, 158, 218, 122, 149, 186] => {
            __private::__global::validate_account_liquidation(
                program_id,
                accounts,
                ix_data,
            )
        }
        [200, 248, 111, 36, 67, 124, 215, 7] => {
            __private::__global::create_risk_state_account(program_id, accounts, ix_data)
        }
        [80, 84, 240, 245, 202, 94, 137, 79] => {
            __private::__global::initialize_covariance_matrix(
                program_id,
                accounts,
                ix_data,
            )
        }
        [159, 90, 25, 160, 144, 57, 53, 92] => {
            __private::__global::update_covariance_matrix(program_id, accounts, ix_data)
        }
        [34, 103, 153, 178, 43, 146, 29, 222] => {
            __private::__global::initialize_mark_prices(program_id, accounts, ix_data)
        }
        [50, 73, 243, 45, 10, 6, 220, 129] => {
            __private::__global::update_mark_prices(program_id, accounts, ix_data)
        }
        _ => Err(anchor_lang::error::ErrorCode::InstructionFallbackNotFound.into()),
    }
}
/// Create a private module to not clutter the program's namespace.
/// Defines an entrypoint for each individual instruction handler
/// wrapper.
mod __private {
    use super::*;
    /// __idl mod defines handlers for injected Anchor IDL instructions.
    pub mod __idl {
        use super::*;
        #[inline(never)]
        #[cfg(not(feature = "no-idl"))]
        pub fn __idl_dispatch(
            program_id: &Pubkey,
            accounts: &[AccountInfo],
            idl_ix_data: &[u8],
        ) -> anchor_lang::Result<()> {
            let mut accounts = accounts;
            let mut data: &[u8] = idl_ix_data;
            let ix = anchor_lang::idl::IdlInstruction::deserialize(&mut data)
                .map_err(|_| {
                    anchor_lang::error::ErrorCode::InstructionDidNotDeserialize
                })?;
            match ix {
                anchor_lang::idl::IdlInstruction::Create { data_len } => {
                    let mut bumps = std::collections::BTreeMap::new();
                    let mut accounts = anchor_lang::idl::IdlCreateAccounts::try_accounts(
                        program_id,
                        &mut accounts,
                        &[],
                        &mut bumps,
                    )?;
                    __idl_create_account(program_id, &mut accounts, data_len)?;
                    accounts.exit(program_id)?;
                }
                anchor_lang::idl::IdlInstruction::CreateBuffer => {
                    let mut bumps = std::collections::BTreeMap::new();
                    let mut accounts = anchor_lang::idl::IdlCreateBuffer::try_accounts(
                        program_id,
                        &mut accounts,
                        &[],
                        &mut bumps,
                    )?;
                    __idl_create_buffer(program_id, &mut accounts)?;
                    accounts.exit(program_id)?;
                }
                anchor_lang::idl::IdlInstruction::Write { data } => {
                    let mut bumps = std::collections::BTreeMap::new();
                    let mut accounts = anchor_lang::idl::IdlAccounts::try_accounts(
                        program_id,
                        &mut accounts,
                        &[],
                        &mut bumps,
                    )?;
                    __idl_write(program_id, &mut accounts, data)?;
                    accounts.exit(program_id)?;
                }
                anchor_lang::idl::IdlInstruction::SetAuthority { new_authority } => {
                    let mut bumps = std::collections::BTreeMap::new();
                    let mut accounts = anchor_lang::idl::IdlAccounts::try_accounts(
                        program_id,
                        &mut accounts,
                        &[],
                        &mut bumps,
                    )?;
                    __idl_set_authority(program_id, &mut accounts, new_authority)?;
                    accounts.exit(program_id)?;
                }
                anchor_lang::idl::IdlInstruction::SetBuffer => {
                    let mut bumps = std::collections::BTreeMap::new();
                    let mut accounts = anchor_lang::idl::IdlSetBuffer::try_accounts(
                        program_id,
                        &mut accounts,
                        &[],
                        &mut bumps,
                    )?;
                    __idl_set_buffer(program_id, &mut accounts)?;
                    accounts.exit(program_id)?;
                }
            }
            Ok(())
        }
        #[inline(never)]
        pub fn __idl_create_account(
            program_id: &Pubkey,
            accounts: &mut anchor_lang::idl::IdlCreateAccounts,
            data_len: u64,
        ) -> anchor_lang::Result<()> {
            ::solana_program::log::sol_log("Instruction: IdlCreateAccount");
            if program_id != accounts.program.key {
                return Err(
                    anchor_lang::error::ErrorCode::IdlInstructionInvalidProgram.into(),
                );
            }
            let from = accounts.from.key;
            let (base, nonce) = Pubkey::find_program_address(&[], program_id);
            let seed = anchor_lang::idl::IdlAccount::seed();
            let owner = accounts.program.key;
            let to = Pubkey::create_with_seed(&base, seed, owner).unwrap();
            let space = 8 + 32 + 4 + data_len as usize;
            let rent = Rent::get()?;
            let lamports = rent.minimum_balance(space);
            let seeds = &[&[nonce][..]];
            let ix = anchor_lang::solana_program::system_instruction::create_account_with_seed(
                from,
                &to,
                &base,
                seed,
                lamports,
                space as u64,
                owner,
            );
            anchor_lang::solana_program::program::invoke_signed(
                &ix,
                &[
                    accounts.from.clone(),
                    accounts.to.clone(),
                    accounts.base.clone(),
                    accounts.system_program.clone(),
                ],
                &[seeds],
            )?;
            let mut idl_account = {
                let mut account_data = accounts.to.try_borrow_data()?;
                let mut account_data_slice: &[u8] = &account_data;
                anchor_lang::idl::IdlAccount::try_deserialize_unchecked(
                    &mut account_data_slice,
                )?
            };
            idl_account.authority = *accounts.from.key;
            let mut data = accounts.to.try_borrow_mut_data()?;
            let dst: &mut [u8] = &mut data;
            let mut cursor = std::io::Cursor::new(dst);
            idl_account.try_serialize(&mut cursor)?;
            Ok(())
        }
        #[inline(never)]
        pub fn __idl_create_buffer(
            program_id: &Pubkey,
            accounts: &mut anchor_lang::idl::IdlCreateBuffer,
        ) -> anchor_lang::Result<()> {
            ::solana_program::log::sol_log("Instruction: IdlCreateBuffer");
            let mut buffer = &mut accounts.buffer;
            buffer.authority = *accounts.authority.key;
            Ok(())
        }
        #[inline(never)]
        pub fn __idl_write(
            program_id: &Pubkey,
            accounts: &mut anchor_lang::idl::IdlAccounts,
            idl_data: Vec<u8>,
        ) -> anchor_lang::Result<()> {
            ::solana_program::log::sol_log("Instruction: IdlWrite");
            let mut idl = &mut accounts.idl;
            idl.data.extend(idl_data);
            Ok(())
        }
        #[inline(never)]
        pub fn __idl_set_authority(
            program_id: &Pubkey,
            accounts: &mut anchor_lang::idl::IdlAccounts,
            new_authority: Pubkey,
        ) -> anchor_lang::Result<()> {
            ::solana_program::log::sol_log("Instruction: IdlSetAuthority");
            accounts.idl.authority = new_authority;
            Ok(())
        }
        #[inline(never)]
        pub fn __idl_set_buffer(
            program_id: &Pubkey,
            accounts: &mut anchor_lang::idl::IdlSetBuffer,
        ) -> anchor_lang::Result<()> {
            ::solana_program::log::sol_log("Instruction: IdlSetBuffer");
            accounts.idl.data = accounts.buffer.data.clone();
            Ok(())
        }
    }
    /// __state mod defines wrapped handlers for state instructions.
    pub mod __state {
        use super::*;
    }
    /// __interface mod defines wrapped handlers for `#[interface]` trait
    /// implementations.
    pub mod __interface {
        use super::*;
    }
    /// __global mod defines wrapped handlers for global instructions.
    pub mod __global {
        use super::*;
        #[inline(never)]
        pub fn validate_account_health(
            program_id: &Pubkey,
            accounts: &[AccountInfo],
            ix_data: &[u8],
        ) -> anchor_lang::Result<()> {
            ::solana_program::log::sol_log("Instruction: ValidateAccountHealth");
            let ix = instruction::ValidateAccountHealth::deserialize(&mut &ix_data[..])
                .map_err(|_| {
                    anchor_lang::error::ErrorCode::InstructionDidNotDeserialize
                })?;
            let instruction::ValidateAccountHealth = ix;
            let mut __bumps = std::collections::BTreeMap::new();
            let mut remaining_accounts: &[AccountInfo] = accounts;
            let mut accounts = ValidateAccountHealth::try_accounts(
                program_id,
                &mut remaining_accounts,
                ix_data,
                &mut __bumps,
            )?;
            let result = risk_engine_program::validate_account_health(
                anchor_lang::context::Context::new(
                    program_id,
                    &mut accounts,
                    remaining_accounts,
                    __bumps,
                ),
            )?;
            accounts.exit(program_id)
        }
        #[inline(never)]
        pub fn validate_account_liquidation(
            program_id: &Pubkey,
            accounts: &[AccountInfo],
            ix_data: &[u8],
        ) -> anchor_lang::Result<()> {
            ::solana_program::log::sol_log("Instruction: ValidateAccountLiquidation");
            let ix = instruction::ValidateAccountLiquidation::deserialize(
                    &mut &ix_data[..],
                )
                .map_err(|_| {
                    anchor_lang::error::ErrorCode::InstructionDidNotDeserialize
                })?;
            let instruction::ValidateAccountLiquidation = ix;
            let mut __bumps = std::collections::BTreeMap::new();
            let mut remaining_accounts: &[AccountInfo] = accounts;
            let mut accounts = ValidateAccountLiquidation::try_accounts(
                program_id,
                &mut remaining_accounts,
                ix_data,
                &mut __bumps,
            )?;
            let result = risk_engine_program::validate_account_liquidation(
                anchor_lang::context::Context::new(
                    program_id,
                    &mut accounts,
                    remaining_accounts,
                    __bumps,
                ),
            )?;
            accounts.exit(program_id)
        }
        #[inline(never)]
        pub fn create_risk_state_account(
            program_id: &Pubkey,
            accounts: &[AccountInfo],
            ix_data: &[u8],
        ) -> anchor_lang::Result<()> {
            ::solana_program::log::sol_log("Instruction: CreateRiskStateAccount");
            let ix = instruction::CreateRiskStateAccount::deserialize(&mut &ix_data[..])
                .map_err(|_| {
                    anchor_lang::error::ErrorCode::InstructionDidNotDeserialize
                })?;
            let instruction::CreateRiskStateAccount = ix;
            let mut __bumps = std::collections::BTreeMap::new();
            let mut remaining_accounts: &[AccountInfo] = accounts;
            let mut accounts = CreateRiskStateAccount::try_accounts(
                program_id,
                &mut remaining_accounts,
                ix_data,
                &mut __bumps,
            )?;
            let result = risk_engine_program::create_risk_state_account(
                anchor_lang::context::Context::new(
                    program_id,
                    &mut accounts,
                    remaining_accounts,
                    __bumps,
                ),
            )?;
            accounts.exit(program_id)
        }
        #[inline(never)]
        pub fn initialize_covariance_matrix(
            program_id: &Pubkey,
            accounts: &[AccountInfo],
            ix_data: &[u8],
        ) -> anchor_lang::Result<()> {
            ::solana_program::log::sol_log("Instruction: InitializeCovarianceMatrix");
            let ix = instruction::InitializeCovarianceMatrix::deserialize(
                    &mut &ix_data[..],
                )
                .map_err(|_| {
                    anchor_lang::error::ErrorCode::InstructionDidNotDeserialize
                })?;
            let instruction::InitializeCovarianceMatrix = ix;
            let mut __bumps = std::collections::BTreeMap::new();
            let mut remaining_accounts: &[AccountInfo] = accounts;
            let mut accounts = InitializeCovarianceMatrix::try_accounts(
                program_id,
                &mut remaining_accounts,
                ix_data,
                &mut __bumps,
            )?;
            let result = risk_engine_program::initialize_covariance_matrix(
                anchor_lang::context::Context::new(
                    program_id,
                    &mut accounts,
                    remaining_accounts,
                    __bumps,
                ),
            )?;
            accounts.exit(program_id)
        }
        #[inline(never)]
        pub fn update_covariance_matrix(
            program_id: &Pubkey,
            accounts: &[AccountInfo],
            ix_data: &[u8],
        ) -> anchor_lang::Result<()> {
            ::solana_program::log::sol_log("Instruction: UpdateCovarianceMatrix");
            let ix = instruction::UpdateCovarianceMatrix::deserialize(&mut &ix_data[..])
                .map_err(|_| {
                    anchor_lang::error::ErrorCode::InstructionDidNotDeserialize
                })?;
            let instruction::UpdateCovarianceMatrix {
                _product_keys,
                _standard_deviations,
                _correlations,
            } = ix;
            let mut __bumps = std::collections::BTreeMap::new();
            let mut remaining_accounts: &[AccountInfo] = accounts;
            let mut accounts = UpdateCovarianceMatrix::try_accounts(
                program_id,
                &mut remaining_accounts,
                ix_data,
                &mut __bumps,
            )?;
            let result = risk_engine_program::update_covariance_matrix(
                anchor_lang::context::Context::new(
                    program_id,
                    &mut accounts,
                    remaining_accounts,
                    __bumps,
                ),
                _product_keys,
                _standard_deviations,
                _correlations,
            )?;
            accounts.exit(program_id)
        }
        #[inline(never)]
        pub fn initialize_mark_prices(
            program_id: &Pubkey,
            accounts: &[AccountInfo],
            ix_data: &[u8],
        ) -> anchor_lang::Result<()> {
            ::solana_program::log::sol_log("Instruction: InitializeMarkPrices");
            let ix = instruction::InitializeMarkPrices::deserialize(&mut &ix_data[..])
                .map_err(|_| {
                    anchor_lang::error::ErrorCode::InstructionDidNotDeserialize
                })?;
            let instruction::InitializeMarkPrices {
                _is_hardcoded_oracle,
                _hardcoded_oracle,
                _hardcoded_oracle_type,
            } = ix;
            let mut __bumps = std::collections::BTreeMap::new();
            let mut remaining_accounts: &[AccountInfo] = accounts;
            let mut accounts = InitializeMarkPrices::try_accounts(
                program_id,
                &mut remaining_accounts,
                ix_data,
                &mut __bumps,
            )?;
            let result = risk_engine_program::initialize_mark_prices(
                anchor_lang::context::Context::new(
                    program_id,
                    &mut accounts,
                    remaining_accounts,
                    __bumps,
                ),
                _is_hardcoded_oracle,
                _hardcoded_oracle,
                _hardcoded_oracle_type,
            )?;
            accounts.exit(program_id)
        }
        #[inline(never)]
        pub fn update_mark_prices(
            program_id: &Pubkey,
            accounts: &[AccountInfo],
            ix_data: &[u8],
        ) -> anchor_lang::Result<()> {
            ::solana_program::log::sol_log("Instruction: UpdateMarkPrices");
            let ix = instruction::UpdateMarkPrices::deserialize(&mut &ix_data[..])
                .map_err(|_| {
                    anchor_lang::error::ErrorCode::InstructionDidNotDeserialize
                })?;
            let instruction::UpdateMarkPrices = ix;
            let mut __bumps = std::collections::BTreeMap::new();
            let mut remaining_accounts: &[AccountInfo] = accounts;
            let mut accounts = UpdateMarkPrices::try_accounts(
                program_id,
                &mut remaining_accounts,
                ix_data,
                &mut __bumps,
            )?;
            let result = risk_engine_program::update_mark_prices(
                anchor_lang::context::Context::new(
                    program_id,
                    &mut accounts,
                    remaining_accounts,
                    __bumps,
                ),
            )?;
            accounts.exit(program_id)
        }
    }
}
pub mod risk_engine_program {
    //! Anchor CPI crate generated from risk_engine_program v0.1.0 using [anchor-gen](https://crates.io/crates/anchor-gen) v0.3.0.
    use super::*;
    pub fn validate_account_health(_ctx: Context<ValidateAccountHealth>) -> Result<()> {
        ::core::panicking::panic_fmt(
            ::core::fmt::Arguments::new_v1(
                &["not implemented: "],
                &[
                    ::core::fmt::ArgumentV1::new_display(
                        &::core::fmt::Arguments::new_v1(
                            &["This program is a wrapper for CPI."],
                            &[],
                        ),
                    ),
                ],
            ),
        )
    }
    pub fn validate_account_liquidation(
        _ctx: Context<ValidateAccountLiquidation>,
    ) -> Result<()> {
        ::core::panicking::panic_fmt(
            ::core::fmt::Arguments::new_v1(
                &["not implemented: "],
                &[
                    ::core::fmt::ArgumentV1::new_display(
                        &::core::fmt::Arguments::new_v1(
                            &["This program is a wrapper for CPI."],
                            &[],
                        ),
                    ),
                ],
            ),
        )
    }
    pub fn create_risk_state_account(
        _ctx: Context<CreateRiskStateAccount>,
    ) -> Result<()> {
        ::core::panicking::panic_fmt(
            ::core::fmt::Arguments::new_v1(
                &["not implemented: "],
                &[
                    ::core::fmt::ArgumentV1::new_display(
                        &::core::fmt::Arguments::new_v1(
                            &["This program is a wrapper for CPI."],
                            &[],
                        ),
                    ),
                ],
            ),
        )
    }
    pub fn initialize_covariance_matrix(
        _ctx: Context<InitializeCovarianceMatrix>,
    ) -> Result<()> {
        ::core::panicking::panic_fmt(
            ::core::fmt::Arguments::new_v1(
                &["not implemented: "],
                &[
                    ::core::fmt::ArgumentV1::new_display(
                        &::core::fmt::Arguments::new_v1(
                            &["This program is a wrapper for CPI."],
                            &[],
                        ),
                    ),
                ],
            ),
        )
    }
    pub fn update_covariance_matrix(
        _ctx: Context<UpdateCovarianceMatrix>,
        _product_keys: Vec<Pubkey>,
        _standard_deviations: Vec<f32>,
        _correlations: Vec<Vec<f32>>,
    ) -> Result<()> {
        ::core::panicking::panic_fmt(
            ::core::fmt::Arguments::new_v1(
                &["not implemented: "],
                &[
                    ::core::fmt::ArgumentV1::new_display(
                        &::core::fmt::Arguments::new_v1(
                            &["This program is a wrapper for CPI."],
                            &[],
                        ),
                    ),
                ],
            ),
        )
    }
    pub fn initialize_mark_prices(
        _ctx: Context<InitializeMarkPrices>,
        _is_hardcoded_oracle: bool,
        _hardcoded_oracle: Vec<Pubkey>,
        _hardcoded_oracle_type: OracleType,
    ) -> Result<()> {
        ::core::panicking::panic_fmt(
            ::core::fmt::Arguments::new_v1(
                &["not implemented: "],
                &[
                    ::core::fmt::ArgumentV1::new_display(
                        &::core::fmt::Arguments::new_v1(
                            &["This program is a wrapper for CPI."],
                            &[],
                        ),
                    ),
                ],
            ),
        )
    }
    pub fn update_mark_prices(_ctx: Context<UpdateMarkPrices>) -> Result<()> {
        ::core::panicking::panic_fmt(
            ::core::fmt::Arguments::new_v1(
                &["not implemented: "],
                &[
                    ::core::fmt::ArgumentV1::new_display(
                        &::core::fmt::Arguments::new_v1(
                            &["This program is a wrapper for CPI."],
                            &[],
                        ),
                    ),
                ],
            ),
        )
    }
}
/// An Anchor generated module containing the program's set of
/// instructions, where each method handler in the `#[program]` mod is
/// associated with a struct defining the input arguments to the
/// method. These should be used directly, when one wants to serialize
/// Anchor instruction data, for example, when speciying
/// instructions on a client.
pub mod instruction {
    use super::*;
    /// Instruction struct definitions for `#[state]` methods.
    pub mod state {
        use super::*;
    }
    /// Instruction.
    pub struct ValidateAccountHealth;
    impl borsh::ser::BorshSerialize for ValidateAccountHealth {
        fn serialize<W: borsh::maybestd::io::Write>(
            &self,
            writer: &mut W,
        ) -> ::core::result::Result<(), borsh::maybestd::io::Error> {
            Ok(())
        }
    }
    impl borsh::de::BorshDeserialize for ValidateAccountHealth {
        fn deserialize(
            buf: &mut &[u8],
        ) -> ::core::result::Result<Self, borsh::maybestd::io::Error> {
            Ok(Self {})
        }
    }
    impl anchor_lang::InstructionData for ValidateAccountHealth {
        fn data(&self) -> Vec<u8> {
            let mut d = [39, 180, 199, 236, 99, 54, 132, 232].to_vec();
            d.append(&mut self.try_to_vec().expect("Should always serialize"));
            d
        }
    }
    /// Instruction.
    pub struct ValidateAccountLiquidation;
    impl borsh::ser::BorshSerialize for ValidateAccountLiquidation {
        fn serialize<W: borsh::maybestd::io::Write>(
            &self,
            writer: &mut W,
        ) -> ::core::result::Result<(), borsh::maybestd::io::Error> {
            Ok(())
        }
    }
    impl borsh::de::BorshDeserialize for ValidateAccountLiquidation {
        fn deserialize(
            buf: &mut &[u8],
        ) -> ::core::result::Result<Self, borsh::maybestd::io::Error> {
            Ok(Self {})
        }
    }
    impl anchor_lang::InstructionData for ValidateAccountLiquidation {
        fn data(&self) -> Vec<u8> {
            let mut d = [48, 105, 196, 158, 218, 122, 149, 186].to_vec();
            d.append(&mut self.try_to_vec().expect("Should always serialize"));
            d
        }
    }
    /// Instruction.
    pub struct CreateRiskStateAccount;
    impl borsh::ser::BorshSerialize for CreateRiskStateAccount {
        fn serialize<W: borsh::maybestd::io::Write>(
            &self,
            writer: &mut W,
        ) -> ::core::result::Result<(), borsh::maybestd::io::Error> {
            Ok(())
        }
    }
    impl borsh::de::BorshDeserialize for CreateRiskStateAccount {
        fn deserialize(
            buf: &mut &[u8],
        ) -> ::core::result::Result<Self, borsh::maybestd::io::Error> {
            Ok(Self {})
        }
    }
    impl anchor_lang::InstructionData for CreateRiskStateAccount {
        fn data(&self) -> Vec<u8> {
            let mut d = [200, 248, 111, 36, 67, 124, 215, 7].to_vec();
            d.append(&mut self.try_to_vec().expect("Should always serialize"));
            d
        }
    }
    /// Instruction.
    pub struct InitializeCovarianceMatrix;
    impl borsh::ser::BorshSerialize for InitializeCovarianceMatrix {
        fn serialize<W: borsh::maybestd::io::Write>(
            &self,
            writer: &mut W,
        ) -> ::core::result::Result<(), borsh::maybestd::io::Error> {
            Ok(())
        }
    }
    impl borsh::de::BorshDeserialize for InitializeCovarianceMatrix {
        fn deserialize(
            buf: &mut &[u8],
        ) -> ::core::result::Result<Self, borsh::maybestd::io::Error> {
            Ok(Self {})
        }
    }
    impl anchor_lang::InstructionData for InitializeCovarianceMatrix {
        fn data(&self) -> Vec<u8> {
            let mut d = [80, 84, 240, 245, 202, 94, 137, 79].to_vec();
            d.append(&mut self.try_to_vec().expect("Should always serialize"));
            d
        }
    }
    /// Instruction.
    pub struct UpdateCovarianceMatrix {
        pub _product_keys: Vec<Pubkey>,
        pub _standard_deviations: Vec<f32>,
        pub _correlations: Vec<Vec<f32>>,
    }
    impl borsh::ser::BorshSerialize for UpdateCovarianceMatrix
    where
        Vec<Pubkey>: borsh::ser::BorshSerialize,
        Vec<f32>: borsh::ser::BorshSerialize,
        Vec<Vec<f32>>: borsh::ser::BorshSerialize,
    {
        fn serialize<W: borsh::maybestd::io::Write>(
            &self,
            writer: &mut W,
        ) -> ::core::result::Result<(), borsh::maybestd::io::Error> {
            borsh::BorshSerialize::serialize(&self._product_keys, writer)?;
            borsh::BorshSerialize::serialize(&self._standard_deviations, writer)?;
            borsh::BorshSerialize::serialize(&self._correlations, writer)?;
            Ok(())
        }
    }
    impl borsh::de::BorshDeserialize for UpdateCovarianceMatrix
    where
        Vec<Pubkey>: borsh::BorshDeserialize,
        Vec<f32>: borsh::BorshDeserialize,
        Vec<Vec<f32>>: borsh::BorshDeserialize,
    {
        fn deserialize(
            buf: &mut &[u8],
        ) -> ::core::result::Result<Self, borsh::maybestd::io::Error> {
            Ok(Self {
                _product_keys: borsh::BorshDeserialize::deserialize(buf)?,
                _standard_deviations: borsh::BorshDeserialize::deserialize(buf)?,
                _correlations: borsh::BorshDeserialize::deserialize(buf)?,
            })
        }
    }
    impl anchor_lang::InstructionData for UpdateCovarianceMatrix {
        fn data(&self) -> Vec<u8> {
            let mut d = [159, 90, 25, 160, 144, 57, 53, 92].to_vec();
            d.append(&mut self.try_to_vec().expect("Should always serialize"));
            d
        }
    }
    /// Instruction.
    pub struct InitializeMarkPrices {
        pub _is_hardcoded_oracle: bool,
        pub _hardcoded_oracle: Vec<Pubkey>,
        pub _hardcoded_oracle_type: OracleType,
    }
    impl borsh::ser::BorshSerialize for InitializeMarkPrices
    where
        bool: borsh::ser::BorshSerialize,
        Vec<Pubkey>: borsh::ser::BorshSerialize,
        OracleType: borsh::ser::BorshSerialize,
    {
        fn serialize<W: borsh::maybestd::io::Write>(
            &self,
            writer: &mut W,
        ) -> ::core::result::Result<(), borsh::maybestd::io::Error> {
            borsh::BorshSerialize::serialize(&self._is_hardcoded_oracle, writer)?;
            borsh::BorshSerialize::serialize(&self._hardcoded_oracle, writer)?;
            borsh::BorshSerialize::serialize(&self._hardcoded_oracle_type, writer)?;
            Ok(())
        }
    }
    impl borsh::de::BorshDeserialize for InitializeMarkPrices
    where
        bool: borsh::BorshDeserialize,
        Vec<Pubkey>: borsh::BorshDeserialize,
        OracleType: borsh::BorshDeserialize,
    {
        fn deserialize(
            buf: &mut &[u8],
        ) -> ::core::result::Result<Self, borsh::maybestd::io::Error> {
            Ok(Self {
                _is_hardcoded_oracle: borsh::BorshDeserialize::deserialize(buf)?,
                _hardcoded_oracle: borsh::BorshDeserialize::deserialize(buf)?,
                _hardcoded_oracle_type: borsh::BorshDeserialize::deserialize(buf)?,
            })
        }
    }
    impl anchor_lang::InstructionData for InitializeMarkPrices {
        fn data(&self) -> Vec<u8> {
            let mut d = [34, 103, 153, 178, 43, 146, 29, 222].to_vec();
            d.append(&mut self.try_to_vec().expect("Should always serialize"));
            d
        }
    }
    /// Instruction.
    pub struct UpdateMarkPrices;
    impl borsh::ser::BorshSerialize for UpdateMarkPrices {
        fn serialize<W: borsh::maybestd::io::Write>(
            &self,
            writer: &mut W,
        ) -> ::core::result::Result<(), borsh::maybestd::io::Error> {
            Ok(())
        }
    }
    impl borsh::de::BorshDeserialize for UpdateMarkPrices {
        fn deserialize(
            buf: &mut &[u8],
        ) -> ::core::result::Result<Self, borsh::maybestd::io::Error> {
            Ok(Self {})
        }
    }
    impl anchor_lang::InstructionData for UpdateMarkPrices {
        fn data(&self) -> Vec<u8> {
            let mut d = [50, 73, 243, 45, 10, 6, 220, 129].to_vec();
            d.append(&mut self.try_to_vec().expect("Should always serialize"));
            d
        }
    }
}
#[cfg(feature = "cpi")]
pub mod cpi {
    use super::*;
    use std::marker::PhantomData;
    pub mod state {
        use super::*;
    }
    pub struct Return<T> {
        phantom: std::marker::PhantomData<T>,
    }
    impl<T: AnchorDeserialize> Return<T> {
        pub fn get(&self) -> T {
            let (_key, data) = anchor_lang::solana_program::program::get_return_data()
                .unwrap();
            T::try_from_slice(&data).unwrap()
        }
    }
    pub fn validate_account_health<'a, 'b, 'c, 'info>(
        ctx: anchor_lang::context::CpiContext<
            'a,
            'b,
            'c,
            'info,
            crate::cpi::accounts::ValidateAccountHealth<'info>,
        >,
    ) -> anchor_lang::Result<()> {
        let ix = {
            let ix = instruction::ValidateAccountHealth;
            let mut ix_data = AnchorSerialize::try_to_vec(&ix)
                .map_err(|_| anchor_lang::error::ErrorCode::InstructionDidNotSerialize)?;
            let mut data = [39, 180, 199, 236, 99, 54, 132, 232].to_vec();
            data.append(&mut ix_data);
            let accounts = ctx.to_account_metas(None);
            anchor_lang::solana_program::instruction::Instruction {
                program_id: crate::ID,
                accounts,
                data,
            }
        };
        let mut acc_infos = ctx.to_account_infos();
        anchor_lang::solana_program::program::invoke_signed(
                &ix,
                &acc_infos,
                ctx.signer_seeds,
            )
            .map_or_else(|e| Err(Into::into(e)), |_| { Ok(()) })
    }
    pub fn validate_account_liquidation<'a, 'b, 'c, 'info>(
        ctx: anchor_lang::context::CpiContext<
            'a,
            'b,
            'c,
            'info,
            crate::cpi::accounts::ValidateAccountLiquidation<'info>,
        >,
    ) -> anchor_lang::Result<()> {
        let ix = {
            let ix = instruction::ValidateAccountLiquidation;
            let mut ix_data = AnchorSerialize::try_to_vec(&ix)
                .map_err(|_| anchor_lang::error::ErrorCode::InstructionDidNotSerialize)?;
            let mut data = [48, 105, 196, 158, 218, 122, 149, 186].to_vec();
            data.append(&mut ix_data);
            let accounts = ctx.to_account_metas(None);
            anchor_lang::solana_program::instruction::Instruction {
                program_id: crate::ID,
                accounts,
                data,
            }
        };
        let mut acc_infos = ctx.to_account_infos();
        anchor_lang::solana_program::program::invoke_signed(
                &ix,
                &acc_infos,
                ctx.signer_seeds,
            )
            .map_or_else(|e| Err(Into::into(e)), |_| { Ok(()) })
    }
    pub fn create_risk_state_account<'a, 'b, 'c, 'info>(
        ctx: anchor_lang::context::CpiContext<
            'a,
            'b,
            'c,
            'info,
            crate::cpi::accounts::CreateRiskStateAccount<'info>,
        >,
    ) -> anchor_lang::Result<()> {
        let ix = {
            let ix = instruction::CreateRiskStateAccount;
            let mut ix_data = AnchorSerialize::try_to_vec(&ix)
                .map_err(|_| anchor_lang::error::ErrorCode::InstructionDidNotSerialize)?;
            let mut data = [200, 248, 111, 36, 67, 124, 215, 7].to_vec();
            data.append(&mut ix_data);
            let accounts = ctx.to_account_metas(None);
            anchor_lang::solana_program::instruction::Instruction {
                program_id: crate::ID,
                accounts,
                data,
            }
        };
        let mut acc_infos = ctx.to_account_infos();
        anchor_lang::solana_program::program::invoke_signed(
                &ix,
                &acc_infos,
                ctx.signer_seeds,
            )
            .map_or_else(|e| Err(Into::into(e)), |_| { Ok(()) })
    }
    pub fn initialize_covariance_matrix<'a, 'b, 'c, 'info>(
        ctx: anchor_lang::context::CpiContext<
            'a,
            'b,
            'c,
            'info,
            crate::cpi::accounts::InitializeCovarianceMatrix<'info>,
        >,
    ) -> anchor_lang::Result<()> {
        let ix = {
            let ix = instruction::InitializeCovarianceMatrix;
            let mut ix_data = AnchorSerialize::try_to_vec(&ix)
                .map_err(|_| anchor_lang::error::ErrorCode::InstructionDidNotSerialize)?;
            let mut data = [80, 84, 240, 245, 202, 94, 137, 79].to_vec();
            data.append(&mut ix_data);
            let accounts = ctx.to_account_metas(None);
            anchor_lang::solana_program::instruction::Instruction {
                program_id: crate::ID,
                accounts,
                data,
            }
        };
        let mut acc_infos = ctx.to_account_infos();
        anchor_lang::solana_program::program::invoke_signed(
                &ix,
                &acc_infos,
                ctx.signer_seeds,
            )
            .map_or_else(|e| Err(Into::into(e)), |_| { Ok(()) })
    }
    pub fn update_covariance_matrix<'a, 'b, 'c, 'info>(
        ctx: anchor_lang::context::CpiContext<
            'a,
            'b,
            'c,
            'info,
            crate::cpi::accounts::UpdateCovarianceMatrix<'info>,
        >,
        _product_keys: Vec<Pubkey>,
        _standard_deviations: Vec<f32>,
        _correlations: Vec<Vec<f32>>,
    ) -> anchor_lang::Result<()> {
        let ix = {
            let ix = instruction::UpdateCovarianceMatrix {
                _product_keys,
                _standard_deviations,
                _correlations,
            };
            let mut ix_data = AnchorSerialize::try_to_vec(&ix)
                .map_err(|_| anchor_lang::error::ErrorCode::InstructionDidNotSerialize)?;
            let mut data = [159, 90, 25, 160, 144, 57, 53, 92].to_vec();
            data.append(&mut ix_data);
            let accounts = ctx.to_account_metas(None);
            anchor_lang::solana_program::instruction::Instruction {
                program_id: crate::ID,
                accounts,
                data,
            }
        };
        let mut acc_infos = ctx.to_account_infos();
        anchor_lang::solana_program::program::invoke_signed(
                &ix,
                &acc_infos,
                ctx.signer_seeds,
            )
            .map_or_else(|e| Err(Into::into(e)), |_| { Ok(()) })
    }
    pub fn initialize_mark_prices<'a, 'b, 'c, 'info>(
        ctx: anchor_lang::context::CpiContext<
            'a,
            'b,
            'c,
            'info,
            crate::cpi::accounts::InitializeMarkPrices<'info>,
        >,
        _is_hardcoded_oracle: bool,
        _hardcoded_oracle: Vec<Pubkey>,
        _hardcoded_oracle_type: OracleType,
    ) -> anchor_lang::Result<()> {
        let ix = {
            let ix = instruction::InitializeMarkPrices {
                _is_hardcoded_oracle,
                _hardcoded_oracle,
                _hardcoded_oracle_type,
            };
            let mut ix_data = AnchorSerialize::try_to_vec(&ix)
                .map_err(|_| anchor_lang::error::ErrorCode::InstructionDidNotSerialize)?;
            let mut data = [34, 103, 153, 178, 43, 146, 29, 222].to_vec();
            data.append(&mut ix_data);
            let accounts = ctx.to_account_metas(None);
            anchor_lang::solana_program::instruction::Instruction {
                program_id: crate::ID,
                accounts,
                data,
            }
        };
        let mut acc_infos = ctx.to_account_infos();
        anchor_lang::solana_program::program::invoke_signed(
                &ix,
                &acc_infos,
                ctx.signer_seeds,
            )
            .map_or_else(|e| Err(Into::into(e)), |_| { Ok(()) })
    }
    pub fn update_mark_prices<'a, 'b, 'c, 'info>(
        ctx: anchor_lang::context::CpiContext<
            'a,
            'b,
            'c,
            'info,
            crate::cpi::accounts::UpdateMarkPrices<'info>,
        >,
    ) -> anchor_lang::Result<()> {
        let ix = {
            let ix = instruction::UpdateMarkPrices;
            let mut ix_data = AnchorSerialize::try_to_vec(&ix)
                .map_err(|_| anchor_lang::error::ErrorCode::InstructionDidNotSerialize)?;
            let mut data = [50, 73, 243, 45, 10, 6, 220, 129].to_vec();
            data.append(&mut ix_data);
            let accounts = ctx.to_account_metas(None);
            anchor_lang::solana_program::instruction::Instruction {
                program_id: crate::ID,
                accounts,
                data,
            }
        };
        let mut acc_infos = ctx.to_account_infos();
        anchor_lang::solana_program::program::invoke_signed(
                &ix,
                &acc_infos,
                ctx.signer_seeds,
            )
            .map_or_else(|e| Err(Into::into(e)), |_| { Ok(()) })
    }
    /// An Anchor generated module, providing a set of structs
    /// mirroring the structs deriving `Accounts`, where each field is
    /// an `AccountInfo`. This is useful for CPI.
    pub mod accounts {
        pub use crate::__cpi_client_accounts_initialize_covariance_matrix::*;
        pub use crate::__cpi_client_accounts_initialize_mark_prices::*;
        pub use crate::__cpi_client_accounts_update_covariance_matrix::*;
        pub use crate::__cpi_client_accounts_update_mark_prices::*;
        pub use crate::__cpi_client_accounts_validate_account_liquidation::*;
        pub use crate::__cpi_client_accounts_validate_account_health::*;
        pub use crate::__cpi_client_accounts_create_risk_state_account::*;
    }
}
/// An Anchor generated module, providing a set of structs
/// mirroring the structs deriving `Accounts`, where each field is
/// a `Pubkey`. This is useful for specifying accounts for a client.
pub mod accounts {
    pub use crate::__client_accounts_initialize_mark_prices::*;
    pub use crate::__client_accounts_update_mark_prices::*;
    pub use crate::__client_accounts_update_covariance_matrix::*;
    pub use crate::__client_accounts_initialize_covariance_matrix::*;
    pub use crate::__client_accounts_create_risk_state_account::*;
    pub use crate::__client_accounts_validate_account_health::*;
    pub use crate::__client_accounts_validate_account_liquidation::*;
}
/// The static program ID
pub static ID: anchor_lang::solana_program::pubkey::Pubkey = anchor_lang::solana_program::pubkey::Pubkey::new_from_array([
    119u8,
    92u8,
    217u8,
    102u8,
    114u8,
    11u8,
    90u8,
    94u8,
    73u8,
    169u8,
    161u8,
    0u8,
    49u8,
    42u8,
    136u8,
    110u8,
    80u8,
    9u8,
    156u8,
    221u8,
    98u8,
    235u8,
    37u8,
    27u8,
    5u8,
    102u8,
    94u8,
    107u8,
    207u8,
    5u8,
    165u8,
    9u8,
]);
/// Confirms that a given pubkey is equivalent to the program ID
pub fn check_id(id: &anchor_lang::solana_program::pubkey::Pubkey) -> bool {
    id == &ID
}
/// Returns the program ID
pub fn id() -> anchor_lang::solana_program::pubkey::Pubkey {
    ID
}
