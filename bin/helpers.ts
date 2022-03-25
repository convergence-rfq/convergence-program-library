import * as anchor from '@project-serum/anchor';
import * as dotenv from 'dotenv';

import * as idl from '../target/idl/rfq.json';

dotenv.config();

anchor.setProvider(anchor.Provider.env());

export async function getPda(provider: any, seed: string): Promise<any> {
  const program = await getProgram(provider);
  const [protocolPda, protocolBump] = await anchor.web3.PublicKey.findProgramAddress(
    [Buffer.from(anchor.utils.bytes.utf8.encode(seed))],
    program.programId
  );
  return [protocolPda, protocolBump];
};

export async function getProgram(provider: anchor.Provider): Promise<any> {
  const programId = new anchor.web3.PublicKey(idl.metadata.address);
  // @ts-ignore
  return new anchor.Program(idl, programId, provider);
};

export const toBuffer = (x: any) => {
  console.log("boogie woogie: ", x);
  return Buffer.from(anchor.utils.bytes.utf8.encode(x));
};