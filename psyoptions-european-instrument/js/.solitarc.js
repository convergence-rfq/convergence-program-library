const path = require("path");

const programDir = path.join(__dirname, "..", "program");
const idlDir = path.join(__dirname, "idl");
const sdkDir = path.join(__dirname, "generated");
const binaryInstallDir = path.join(__dirname, ".crates");

module.exports = {
  idlGenerator: "anchor",
  programName: "psyoptions_european_instrument",
  programId: "4KC8MQi2zQGr7LhTCVTMhbKuP4KcpTmdZjxsDBWrTSVf",
  idlDir,
  sdkDir,
  binaryInstallDir,
  programDir,
};
