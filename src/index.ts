import { u64 } from "@solana/spl-token";
import { Connection, PublicKey } from "@solana/web3.js";
import BN from "bn.js";
import bs58 from "bs58";
import { sha256 } from "js-sha256";
import invariant from "tiny-invariant";

const CONNECTION = new Connection("https://ssc-dao.genesysgo.net");

export function sighash(name: string): Buffer {
  const preimage = `global:${name}`;
  return Buffer.from(sha256.digest(preimage)).slice(0, 8);
}

async function main() {
  // It all starts with a transaction, Sell on the new ME program M2mx93ekt1fmXSVkTrUL9xVFHkmME8HTUi5Cyc5aF7K
  const sniffedSignature =
    "5ixvnqsNXMYpoJv7oBAWnTjUKGoE8rT5HHmyZXfssZcxpqZvW4tHaT6xAkVNhneXkQb11LQ9X3PoCyb4CbitFGT7";
  const tx = await CONNECTION.getTransaction(sniffedSignature);
  if (!tx) throw new Error("Could not fetch tx");

  // What we can see in the log
  const price = 250000000;
  const priceBuffer = new u64(price).toBuffer();

  // Inspect the IX first
  const ix = tx.transaction.message.instructions[0]!;

  const ixData = Buffer.from(bs58.decode(ix.data));

  // Scan for things
  console.log(`IX DATA, length ${ixData.length} bytes`);
  console.log("sighash offset:", ixData.indexOf(sighash("sell")));
  console.log("price offset:", ixData.indexOf(priceBuffer)); // then price is used to calculate the PDA?
  console.log();

  // We have the thing let's work
  const statePk = new PublicKey("BQWkM1wg3XKaHhJf2h6ft8Ey7WoK6kiTkhJ2ErcH6kbr");
  const state = await CONNECTION.getAccountInfo(statePk);
  if (!state) throw new Error("Escrow pk cannot be found");
  console.log(`State data, length ${state.data.length} bytes`);
  //console.log(state.data);

  // First 8 bytes, account descriptor
  // bad bad, do better
  console.log(
    "seller pk offset:",
    state.data.indexOf(
      tx.transaction.message.accountKeys[ix.accounts[0]!]!.toBuffer()
    )
  );
  console.log(
    "ta pk offset:",
    state.data.indexOf(
      tx.transaction.message.accountKeys[ix.accounts[2]!]!.toBuffer()
    )
  );
  // ...
}

main();
