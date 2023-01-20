const path = require("path");

const programDir = path.join(__dirname, "..", "program");
const idlDir = path.join(__dirname, "idl");
const sdkDir = path.join(__dirname, "generated");
const binaryInstallDir = path.join(__dirname, ".crates");

module.exports = {
  idlGenerator: "anchor",
  programName: "risk_engine",
  programId: "AVauPJngjyumG2c2dRaGjdDPbrYwZLmV5iSTHAea4GXn",
  idlDir,
  sdkDir,
  binaryInstallDir,
  programDir,
};
