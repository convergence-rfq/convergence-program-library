const path = require("path");

const programDir = path.join(__dirname, "..", "program");
const idlDir = path.join(__dirname, "idl");
const sdkDir = path.join(__dirname, "generated");
const binaryInstallDir = path.join(__dirname, ".crates");

module.exports = {
  idlGenerator: "anchor",
  programName: "psyoptions_american_instrument",
  programId: "HpmyVA3t3uNGgdx86AuwZww7gnAWB57vepnk3732vEr9",
  idlDir,
  sdkDir,
  binaryInstallDir,
  programDir,
};
