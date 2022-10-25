const path = require("path");

const programDir = path.join(__dirname, "..", "program");
const idlDir = path.join(__dirname, "idl");
const sdkDir = path.join(__dirname, "generated");
const binaryInstallDir = path.join(__dirname, ".crates");

module.exports = {
  idlGenerator: "anchor",
  programName: "spot_instrument",
  programId: "826r9RA3AGHPas5E4DgbN9MpYa8gE2ZDUPUJW6GEZ3cT",
  idlDir,
  sdkDir,
  binaryInstallDir,
  programDir,
};