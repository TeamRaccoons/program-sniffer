import { u64 } from "@solana/spl-token";
import {
  Connection,
  Message,
  PublicKey,
  TransactionResponse,
} from "@solana/web3.js";
import BN from "bn.js";
import bs58 from "bs58";
import { sha256 } from "js-sha256";
import invariant from "tiny-invariant";

const CONNECTION = new Connection("https://ssc-dao.genesysgo.net");

// Anchor standard ix sighash
export function sighash(name: string): Buffer {
  const preimage = `global:${name}`;
  return Buffer.from(sha256.digest(preimage)).slice(0, 8);
}

function getIxAccountPk(message: Message, ixIndex: number, accIxIndex: number) {
  const ix = message.instructions[ixIndex];
  if (!ix) throw Error("Cannot find ix");
  const accountIndex = ix.accounts[accIxIndex];
  if (accountIndex === undefined) throw new Error("Cannot find account index");
  const key = message.accountKeys[accountIndex];
  if (!key) throw new Error("Cannot find account key");
  return key;
}

async function main() {
  // It all starts with a transaction, Sell on the new ME program M2mx93ekt1fmXSVkTrUL9xVFHkmME8HTUi5Cyc5aF7K
  const sniffedSignature =
    "5ixvnqsNXMYpoJv7oBAWnTjUKGoE8rT5HHmyZXfssZcxpqZvW4tHaT6xAkVNhneXkQb11LQ9X3PoCyb4CbitFGT7";
  const tx = await CONNECTION.getTransaction(sniffedSignature);
  if (!tx) throw new Error("Could not fetch tx");

  // What we can see in the log
  const price = 69690000000;
  const priceBuffer = new u64(price).toBuffer();

  const timestamp = new BN([1, 0, 0, 0, 0, 0, 0, 0]); // -1, don't know how to make a i64 (unsigned 64 bit integer)

  // Inspect the IX first
  const ix = tx.transaction.message.instructions[0]!;

  const ixData = Buffer.from(bs58.decode(ix.data));

  // Scan for things
  console.log(`IX DATA, length ${ixData.length} bytes`);
  console.log("sighash offset:", ixData.indexOf(sighash("sell")));
  console.log("price offset:", ixData.indexOf(priceBuffer));
  console.log("timestamp offset:", ixData.indexOf(timestamp.toBuffer()));
  // 8 bytes of 0x\ff, what is it? check UI for clue
  console.log();

  // We have the thing let's work
  const statePk = new PublicKey("BQWkM1wg3XKaHhJf2h6ft8Ey7WoK6kiTkhJ2ErcH6kbr");
  const state = await CONNECTION.getAccountInfo(statePk);
  if (!state) throw new Error("Escrow pk cannot be found");
  console.log(`State data, length ${state.data.length} bytes`);
  //console.log(state.data);

  const message = tx.transaction.message;
  const ta = getIxAccountPk(message, 0, 2);

  // accounts index, not explorer #
  // 0 user
  // 1 system program
  // 2 ta
  // 3 ta
  // 4 mint
  // 5 master edition
  // 6 commission ?
  // 7 program pda something
  // 8 escrow state
  // 9 commission
  // 10
  // ...
  // 13 escrow authority

  // First 8 bytes, account descriptor
  // bad bad, do better
  console.log("price offset:", state.data.indexOf(priceBuffer));
  console.log("timestamp offset:", state.data.indexOf(timestamp.toBuffer()));
  console.log(
    "seller pk offset:",
    state.data.indexOf(getIxAccountPk(message, 0, 0).toBuffer())
  );
  console.log("ta pk offset:", state.data.indexOf(ta.toBuffer()));
  console.log(
    "mint pk offset:",
    state.data.indexOf(getIxAccountPk(message, 0, 4).toBuffer())
  );
  // ...
}

main();
