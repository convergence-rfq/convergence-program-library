const path = require("path");

const programDir = path.join(__dirname, "..", "program");
const idlDir = path.join(__dirname, "idl");
const sdkDir = path.join(__dirname, "generated");
const binaryInstallDir = path.join(__dirname, ".crates");

module.exports = {
  idlGenerator: "anchor",
  programName: "risk_engine",
  programId: "7Frguj6Q6pwwq9xU5UdUqShRx8E6Mj555BNccrpXvuxo",
  idlDir,
  sdkDir,
  binaryInstallDir,
  programDir,
};
