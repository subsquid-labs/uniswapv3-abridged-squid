import { Tx } from "../model";
import { Transaction } from "../processor";

export function createTransaction(id: string, tx: Transaction): Tx {
  return new Tx({
    id,
    blockNumber: tx.block.height,
    timestamp: new Date(tx.block.timestamp),
    from: tx.from,
    to: tx.to,
    gasUsed: tx.gasUsed,
    gasPrice: tx.gasPrice,
  });
}
