const path = require("path");

const programDir = path.join(__dirname, "..", "program");
const idlDir = path.join(__dirname, "idl");
const sdkDir = path.join(__dirname, "generated");
const binaryInstallDir = path.join(__dirname, ".crates");

module.exports = {
  idlGenerator: "anchor",
  programName: "psyoptions_american_instrument",
  programId: "7GcKLyM73RRJshRLQqX8yw9K3hTHkx1Ei14mKoKxi3ZR",
  idlDir,
  sdkDir,
  binaryInstallDir,
  programDir,
};
