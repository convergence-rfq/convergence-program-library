"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.InstrumentController = void 0;
const anchor_1 = require("@project-serum/anchor");
class InstrumentController {
    constructor(instrument, legInfo, decimals) {
        this.instrument = instrument;
        this.legInfo = legInfo;
        this.decimals = decimals;
    }
    getBaseAssetIndex() {
        if (this.legInfo === null) {
            throw Error("Instrument is used for quote!");
        }
        return this.legInfo.baseAssetIndex;
    }
    toLegData() {
        if (this.legInfo === null) {
            throw Error("Instrument is used for quote!");
        }
        return {
            instrumentProgram: this.instrument.getProgramId(),
            baseAssetIndex: { value: this.legInfo.baseAssetIndex },
            instrumentData: this.instrument.serializeInstrumentData(),
            instrumentAmount: new anchor_1.BN(this.legInfo.amount),
            instrumentDecimals: this.decimals,
            side: this.legInfo.side,
        };
    }
    toQuoteData() {
        if (this.legInfo !== null) {
            throw Error("Instrument is used for leg!");
        }
        return {
            instrumentProgram: this.instrument.getProgramId(),
            instrumentData: this.instrument.serializeInstrumentData(),
            instrumentDecimals: this.decimals,
        };
    }
    getInstrumendDataSize() {
        return this.instrument.serializeInstrumentData().length;
    }
    getProgramAccount() {
        return { pubkey: this.instrument.getProgramId(), isSigner: false, isWritable: false };
    }
    getValidationAccounts() {
        return __awaiter(this, void 0, void 0, function* () {
            return [this.getProgramAccount()].concat(yield this.instrument.getValidationAccounts());
        });
    }
    getPrepareSettlementAccounts(side, assetIdentifier, rfq, response) {
        return __awaiter(this, void 0, void 0, function* () {
            return [this.getProgramAccount()].concat(yield this.instrument.getPrepareSettlementAccounts(side, assetIdentifier, rfq, response));
        });
    }
    getSettleAccounts(assetReceiver, assetIdentifier, rfq, response) {
        return __awaiter(this, void 0, void 0, function* () {
            return [this.getProgramAccount()].concat(yield this.instrument.getSettleAccounts(assetReceiver, assetIdentifier, rfq, response));
        });
    }
    getRevertSettlementPreparationAccounts(side, assetIdentifier, rfq, response) {
        return __awaiter(this, void 0, void 0, function* () {
            return [this.getProgramAccount()].concat(yield this.instrument.getRevertSettlementPreparationAccounts(side, assetIdentifier, rfq, response));
        });
    }
    getCleanUpAccounts(assetIdentifier, rfq, response) {
        return __awaiter(this, void 0, void 0, function* () {
            return [this.getProgramAccount()].concat(yield this.instrument.getCleanUpAccounts(assetIdentifier, rfq, response));
        });
    }
}
exports.InstrumentController = InstrumentController;
