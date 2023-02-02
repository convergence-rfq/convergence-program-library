const path = require("path");

const programDir = path.join(__dirname, "..", "program");
const idlDir = path.join(__dirname, "idl");
const sdkDir = path.join(__dirname, "generated");
const binaryInstallDir = path.join(__dirname, ".crates");

module.exports = {
  idlGenerator: "anchor",
  programName: "rfq",
  programId: "FNqQsjRU3CRx4N4BvMbTxCrCRBkvKyEZC5mDr4HTxnW4",
  idlDir,
  sdkDir,
  binaryInstallDir,
  programDir,
};
