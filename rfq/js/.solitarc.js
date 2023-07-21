const path = require("path");

const programDir = path.join(__dirname, "..", "program");
const idlDir = path.join(__dirname, "idl");
const sdkDir = path.join(__dirname, "generated");
const binaryInstallDir = path.join(__dirname, ".crates");

module.exports = {
  idlGenerator: "anchor",
  programName: "rfq",
  programId: "CeYwCe6YwBvRE9CpRU2Zgc5oQP7r2ThNqicyKN37Unn4",
  idlDir,
  sdkDir,
  binaryInstallDir,
  programDir,
};
