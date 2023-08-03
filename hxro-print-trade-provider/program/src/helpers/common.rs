use anchor_lang::prelude::*;
use anchor_lang::AnchorDeserialize;

use rfq::state::Leg;
use rfq::state::SettlementTypeMetadata;
use risk_engine::state::{FutureCommonData, InstrumentType, OptionCommonData};

use crate::errors::HxroPrintTradeProviderError;
use crate::state::ParsedLegData;

pub(crate) enum ParsedRiskEngineData {
    ForOption(OptionCommonData),
    ForFuture(FutureCommonData),
}

pub(crate) fn get_leg_instrument_type(leg: &Leg) -> Result<InstrumentType> {
    let instrument_type_raw = match leg.settlement_type_metadata {
        SettlementTypeMetadata::PrintTrade { instrument_type } => instrument_type,
        SettlementTypeMetadata::Instrument {
            instrument_index: _,
        } => unreachable!(),
    };
    instrument_type_raw
        .try_into()
        .map_err(|_| HxroPrintTradeProviderError::InvalidLegInstrumentType.into())
}

pub(crate) fn parse_leg_data(
    leg: &Leg,
    instrument_type: InstrumentType,
) -> Result<(ParsedRiskEngineData, ParsedLegData)> {
    let mut data_slice = leg.data.as_slice();
    let risk_engine_data = match instrument_type {
        InstrumentType::Option => {
            ParsedRiskEngineData::ForOption(AnchorDeserialize::deserialize(&mut data_slice)?)
        }
        InstrumentType::TermFuture | InstrumentType::PerpFuture => {
            ParsedRiskEngineData::ForFuture(AnchorDeserialize::deserialize(&mut data_slice)?)
        }
        _ => err!(HxroPrintTradeProviderError::InvalidLegInstrumentType)?,
    };
    let parsed_leg_data = AnchorDeserialize::deserialize(&mut data_slice)?;

    require_eq!(
        data_slice.len(),
        0,
        HxroPrintTradeProviderError::InvalidDataSize
    );

    Ok((risk_engine_data, parsed_leg_data))
}
