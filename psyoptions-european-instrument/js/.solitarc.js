const path = require("path");

const programDir = path.join(__dirname, "..", "program");
const idlDir = path.join(__dirname, "idl");
const sdkDir = path.join(__dirname, "generated");
const binaryInstallDir = path.join(__dirname, ".crates");

module.exports = {
  idlGenerator: "anchor",
  programName: "psyoptions_european_instrument",
  programId: "A86fhhdNVDdXV8pB48WXtPeM3EBkcBeJEdrx9xrUo9nF",
  idlDir,
  sdkDir,
  binaryInstallDir,
  programDir,
};
