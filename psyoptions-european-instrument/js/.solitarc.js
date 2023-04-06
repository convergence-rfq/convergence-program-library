const path = require("path");

const programDir = path.join(__dirname, "..", "program");
const idlDir = path.join(__dirname, "idl");
const sdkDir = path.join(__dirname, "generated");
const binaryInstallDir = path.join(__dirname, ".crates");

module.exports = {
  idlGenerator: "anchor",
  programName: "psyoptions_european_instrument",
  programId: "HmJ8K5xb6kXbVbvRriq1Z7oPdEaPmKXpEM4Un9nr5b1",
  idlDir,
  sdkDir,
  binaryInstallDir,
  programDir,
};
