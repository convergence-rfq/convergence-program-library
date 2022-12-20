"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OracleProvider = void 0;
/**
 * An enum for the supported oracle providers, mapping to their provider ID.
 */
var OracleProvider;
(function (OracleProvider) {
    OracleProvider[OracleProvider["PYTH"] = 0] = "PYTH";
    OracleProvider[OracleProvider["SWITCHBOARD"] = 1] = "SWITCHBOARD";
})(OracleProvider = exports.OracleProvider || (exports.OracleProvider = {}));
