const path = require("path");

const programDir = path.join(__dirname, "..", "program");
const idlDir = path.join(__dirname, "idl");
const sdkDir = path.join(__dirname, "generated");
const binaryInstallDir = path.join(__dirname, ".crates");

module.exports = {
  idlGenerator: "anchor",
  programName: "psyoptions_american_instrument",
  programId: "ATtEpDQ6smvJnMSJvhLc21DBCTBKutih7KBf9Qd5b8xy",
  idlDir,
  sdkDir,
  binaryInstallDir,
  programDir,
};
