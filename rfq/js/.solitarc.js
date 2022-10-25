const path = require("path");

const programDir = path.join(__dirname, "..", "program");
const idlDir = path.join(__dirname, "idl");
const sdkDir = path.join(__dirname, "generated");
const binaryInstallDir = path.join(__dirname, ".crates");

module.exports = {
  idlGenerator: "anchor",
  programName: "rfq",
  programId: "J2rDyo2NpZn4FQ5rGXmdwh3i2y1h11ynodYrrcUxfErq",
  idlDir,
  sdkDir,
  binaryInstallDir,
  programDir,
};