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
    constructor(instrument, amount, side) {
        this.instrument = instrument;
        this.amount = amount;
        this.side = side;
    }
    toLegData() {
        return __awaiter(this, void 0, void 0, function* () {
            return {
                instrument: this.instrument.getProgramId(),
                instrumentData: this.instrument.serializeLegData(),
                instrumentAmount: new anchor_1.BN(this.amount),
                side: this.side,
            };
        });
    }
    getInstrumendDataSize() {
        return this.instrument.serializeLegData().length;
    }
    getProgramAccount() {
        return { pubkey: this.instrument.getProgramId(), isSigner: false, isWritable: false };
    }
    getValidationAccounts() {
        return __awaiter(this, void 0, void 0, function* () {
            return [this.getProgramAccount()].concat(yield this.instrument.getValidationAccounts());
        });
    }
    getPrepareSettlementAccounts(side, legIndex, rfq, response) {
        return __awaiter(this, void 0, void 0, function* () {
            return [this.getProgramAccount()].concat(yield this.instrument.getPrepareSettlementAccounts(side, legIndex, rfq, response));
        });
    }
    getSettleAccounts(assetReceiver, legIndex, rfq, response) {
        return __awaiter(this, void 0, void 0, function* () {
            return [this.getProgramAccount()].concat(yield this.instrument.getSettleAccounts(assetReceiver, legIndex, rfq, response));
        });
    }
    getRevertSettlementPreparationAccounts(side, legIndex, rfq, response) {
        return __awaiter(this, void 0, void 0, function* () {
            return [this.getProgramAccount()].concat(yield this.instrument.getRevertSettlementPreparationAccounts(side, legIndex, rfq, response));
        });
    }
    getCleanUpAccounts(legIndex, rfq, response) {
        return __awaiter(this, void 0, void 0, function* () {
            return [this.getProgramAccount()].concat(yield this.instrument.getCleanUpAccounts(legIndex, rfq, response));
        });
    }
}
exports.InstrumentController = InstrumentController;
