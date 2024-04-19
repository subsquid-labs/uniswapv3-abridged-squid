// import { Multicall } from "../abi/multicall";
import {
  Burn,
  Mint,
  Pool,
  Swap,
  Tx,
} from "../model";

import { StoreWithCache } from "@belopash/typeorm-store";
import { ProcessorContext, BlockData, Block, Log, Transaction } from "../processor";
import * as poolAbi from "../abi/pool";
import assert from 'assert';
  
type Task = () => Promise<void>;
type PairsMappingContext = ProcessorContext<StoreWithCache> & { queue: {
  Pool: Task[],
  Tx: Task[],
  Mint: Task[],
  Burn: Task[],
  Swap: Task[],
}};
  
export async function processPairsData(
  mctx: PairsMappingContext,
  blocks: BlockData[],
  pools: Set<string>
): Promise<void> {

  for (let block of blocks) {
    for (let log of block.logs) {
      if (pools.has(log.address)) {
        switch (log.topics[0]) {
          case poolAbi.events.Initialize.topic:
            await handleInitialize(mctx, log);
            break;
          case poolAbi.events.Burn.topic:
            await handleBurn(mctx, block.header, log);
            break;
          case poolAbi.events.Mint.topic:
            await handleMint(mctx, block.header, log);
            break;
          case poolAbi.events.Swap.topic:
            await handleSwap(mctx, block.header, log);
            break;
        }
      }
    }
  }
}

async function handleInitialize(
  mctx: PairsMappingContext,
  log: Log
) {
  let {tick, sqrtPriceX96} = poolAbi.events.Initialize.decode(log);
  const deferredPool = mctx.store.defer(Pool, log.address);
  mctx.queue.Pool.push(async () => {
    console.log(`Pool init handler is attempting to retrieve pool ${log.address}, tx ${log.transaction?.hash}`);
    const pool = await deferredPool.getOrFail();
    pool.initialTick = tick;
    pool.initialSqrtPriceX96 = sqrtPriceX96;
    await mctx.store.upsert(pool);
  })
}

async function handleMint(
  mctx: PairsMappingContext,
  blockHeader: Block,
  log: Log
) {
  assert(log.transaction !== undefined, "Parent transaction not found for Mint");
  const mintTx = createTransaction(log.transaction, blockHeader);
  mctx.queue.Tx.push(async () => {
    await mctx.store.upsert(mintTx);
  })

  let {
    sender,
    owner,
    tickLower,
    tickUpper,
    amount,
    amount0,
    amount1
  } = poolAbi.events.Mint.decode(log);
  const deferredPool = mctx.store.defer(Pool, log.address);
  mctx.queue.Mint.push(async () => {
    console.log(`Mint handler is attempting to retrieve pool, tx ${mintTx.id}`);
    const pool = await deferredPool.getOrFail();
    await mctx.store.upsert(new Mint({
      id: mintTx.id,
      transaction: mintTx,
      timestamp: new Date(blockHeader.timestamp),
      poolAddress: pool.id,
      pool,
      owner: owner.toLowerCase(),
      sender: sender.toLowerCase(),
      amount,
      amount0,
      amount1,
      tickLower,
      tickUpper,
      origin: mintTx.from,
      logIndex: log.logIndex
    }))
  })
}

async function handleBurn(
  mctx: PairsMappingContext,
  blockHeader: Block,
  log: Log
) {
  assert(log.transaction !== undefined, "Parent transaction not found for Burn");
  const burnTx = createTransaction(log.transaction, blockHeader);
  mctx.queue.Tx.push(async () => {
    await mctx.store.upsert(burnTx);
  })

  let {
    owner,
    tickLower,
    tickUpper,
    amount,
    amount0,
    amount1
  } = poolAbi.events.Burn.decode(log);
  const deferredPool = mctx.store.defer(Pool, log.address);
  mctx.queue.Burn.push(async () => {
    console.log(`Burn handler is attempting to retrieve pool, tx ${burnTx.id}`);
    const pool = await deferredPool.getOrFail();
    await mctx.store.upsert(new Burn({
      id: burnTx.id,
      transaction: burnTx,
      timestamp: new Date(blockHeader.timestamp),
      poolAddress: pool.id,
      pool,
      owner: owner.toLowerCase(),
      amount,
      amount0,
      amount1,
      tickLower,
      tickUpper,
      origin: burnTx.from,
      logIndex: log.logIndex
    }))
  })
}

async function handleSwap(
  mctx: PairsMappingContext,
  blockHeader: Block,
  log: Log
) {
  assert(log.transaction !== undefined, "Parent transaction not found for Swap");
  const swapTx = createTransaction(log.transaction, blockHeader);
  mctx.queue.Tx.push(async () => {
    await mctx.store.upsert(swapTx);
  })

  let {
    sender,
    recipient,
    amount0,
    amount1,
    sqrtPriceX96,
    liquidity,
    tick
  } = poolAbi.events.Swap.decode(log);
  const deferredPool = mctx.store.defer(Pool, log.address);
  mctx.queue.Swap.push(async () => {
    console.log(`Swap handler is attempting to retrieve pool, tx ${swapTx.id}`);
    const pool = await deferredPool.getOrFail();
    await mctx.store.upsert(new Swap({
      id: swapTx.id,
      transaction: swapTx,
      timestamp: new Date(blockHeader.timestamp),
      poolAddress: pool.id,
      pool,
      sender: sender.toLowerCase(),
      recipient: recipient.toLowerCase(),
      amount0,
      amount1,
      sqrtPriceX96,
      liquidity,
      tick,
      origin: swapTx.from,
      logIndex: log.logIndex
    }))
  })
}

function createTransaction(tx: Transaction, blockHeader: Block): Tx {
  return new Tx({
    id: tx.hash,
    blockNumber: blockHeader.height,
    timestamp: new Date(blockHeader.timestamp),
    from: tx.from,
    to: tx.to,
    gasUsed: tx.gasUsed,
    gasPrice: tx.gasPrice,
  });
}