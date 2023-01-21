const path = require("path");

const programDir = path.join(__dirname, "..", "program");
const idlDir = path.join(__dirname, "src/idl");
const sdkDir = path.join(__dirname, "src/generated");
const binaryInstallDir = path.join(__dirname, ".crates");

module.exports = {
  idlGenerator: "anchor",
  programName: "rfq",
  programId: "EYZVRgDAWHahx3bJXFms7CoPA6ncwJFkGFPiTa15X8Fk",
  idlDir,
  sdkDir,
  binaryInstallDir,
  programDir,
};
