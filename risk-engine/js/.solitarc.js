const path = require("path");

const programDir = path.join(__dirname, "..", "program");
const idlDir = path.join(__dirname, "idl");
const sdkDir = path.join(__dirname, "generated");
const binaryInstallDir = path.join(__dirname, ".crates");

module.exports = {
  idlGenerator: "anchor",
  programName: "risk_engine",
  programId: "AY9P4T28wvG7zHGvMNmdUAzAdwQFrfyzQRdi8nhH5fpv",
  idlDir,
  sdkDir,
  binaryInstallDir,
  programDir,
};
