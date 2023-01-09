const path = require("path");

const programDir = path.join(__dirname, "..", "program");
const idlDir = path.join(__dirname, "idl");
const sdkDir = path.join(__dirname, "generated");
const binaryInstallDir = path.join(__dirname, ".crates");

module.exports = {
  idlGenerator: "anchor",
  programName: "psyoptions_american_instrument",
  programId: "7ZD9LcvMPfurRYz2AuZPWgtSXuSxPmvZNMBFK7fhyvQA",
  idlDir,
  sdkDir,
  binaryInstallDir,
  programDir,
};
