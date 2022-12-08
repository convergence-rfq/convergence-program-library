import * as psyoptionAmerican from "@mithraic-labs/psy-american";
import { Token, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import * as anchor from "@project-serum/anchor";
let rpc = new anchor.web3.Connection(anchor.web3.clusterApiUrl("devnet"));
let payer = anchor.AnchorProvider.env().wallet as anchor.Wallet;
