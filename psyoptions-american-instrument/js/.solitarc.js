const path = require("path");

const programDir = path.join(__dirname, "..", "program");
const idlDir = path.join(__dirname, "idl");
const sdkDir = path.join(__dirname, "generated");
const binaryInstallDir = path.join(__dirname, ".crates");

module.exports = {
  idlGenerator: "anchor",
  programName: "psyoptions_american_instrument",
  programId: "Cdaz7EGr2AVDkCpjMVEXDzap6oRrrrZUEaKAVLmJAX7R",
  idlDir,
  sdkDir,
  binaryInstallDir,
  programDir,
};
