"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorFromName = exports.errorFromCode = exports.NotFirstToPrepareError = exports.InvalidBackupAddressError = exports.InvalidReceiverError = exports.PassedMintDoesNotMatchError = exports.InvalidDataSizeError = void 0;
const createErrorFromCodeLookup = new Map();
const createErrorFromNameLookup = new Map();
class InvalidDataSizeError extends Error {
    constructor() {
        super('Invalid data size');
        this.code = 0x1770;
        this.name = 'InvalidDataSize';
        if (typeof Error.captureStackTrace === 'function') {
            Error.captureStackTrace(this, InvalidDataSizeError);
        }
    }
}
exports.InvalidDataSizeError = InvalidDataSizeError;
createErrorFromCodeLookup.set(0x1770, () => new InvalidDataSizeError());
createErrorFromNameLookup.set('InvalidDataSize', () => new InvalidDataSizeError());
class PassedMintDoesNotMatchError extends Error {
    constructor() {
        super('Passed mint account does not match');
        this.code = 0x1771;
        this.name = 'PassedMintDoesNotMatch';
        if (typeof Error.captureStackTrace === 'function') {
            Error.captureStackTrace(this, PassedMintDoesNotMatchError);
        }
    }
}
exports.PassedMintDoesNotMatchError = PassedMintDoesNotMatchError;
createErrorFromCodeLookup.set(0x1771, () => new PassedMintDoesNotMatchError());
createErrorFromNameLookup.set('PassedMintDoesNotMatch', () => new PassedMintDoesNotMatchError());
class InvalidReceiverError extends Error {
    constructor() {
        super('Passed account is not an associated token account of a receiver');
        this.code = 0x1772;
        this.name = 'InvalidReceiver';
        if (typeof Error.captureStackTrace === 'function') {
            Error.captureStackTrace(this, InvalidReceiverError);
        }
    }
}
exports.InvalidReceiverError = InvalidReceiverError;
createErrorFromCodeLookup.set(0x1772, () => new InvalidReceiverError());
createErrorFromNameLookup.set('InvalidReceiver', () => new InvalidReceiverError());
class InvalidBackupAddressError extends Error {
    constructor() {
        super('Passed backup address should be an associated account of protocol owner');
        this.code = 0x1773;
        this.name = 'InvalidBackupAddress';
        if (typeof Error.captureStackTrace === 'function') {
            Error.captureStackTrace(this, InvalidBackupAddressError);
        }
    }
}
exports.InvalidBackupAddressError = InvalidBackupAddressError;
createErrorFromCodeLookup.set(0x1773, () => new InvalidBackupAddressError());
createErrorFromNameLookup.set('InvalidBackupAddress', () => new InvalidBackupAddressError());
class NotFirstToPrepareError extends Error {
    constructor() {
        super('Passed address is not of a party first to prepare for settlement');
        this.code = 0x1774;
        this.name = 'NotFirstToPrepare';
        if (typeof Error.captureStackTrace === 'function') {
            Error.captureStackTrace(this, NotFirstToPrepareError);
        }
    }
}
exports.NotFirstToPrepareError = NotFirstToPrepareError;
createErrorFromCodeLookup.set(0x1774, () => new NotFirstToPrepareError());
createErrorFromNameLookup.set('NotFirstToPrepare', () => new NotFirstToPrepareError());
function errorFromCode(code) {
    const createError = createErrorFromCodeLookup.get(code);
    return createError != null ? createError() : null;
}
exports.errorFromCode = errorFromCode;
function errorFromName(name) {
    const createError = createErrorFromNameLookup.get(name);
    return createError != null ? createError() : null;
}
exports.errorFromName = errorFromName;
//# sourceMappingURL=index.js.map