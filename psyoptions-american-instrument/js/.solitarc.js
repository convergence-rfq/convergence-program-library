const path = require("path");

const programDir = path.join(__dirname, "..", "program");
const idlDir = path.join(__dirname, "idl");
const sdkDir = path.join(__dirname, "generated");
const binaryInstallDir = path.join(__dirname, ".crates");

module.exports = {
  idlGenerator: "shank",
  programName: "psyoptions_american_instrument",
  //programId: "CvMZtmG8TaUcqZRxYBx1XpNzgWEewAMsiZbPTNxcz2iL",
  idlDir,
  sdkDir,
  binaryInstallDir,
  programDir,
};