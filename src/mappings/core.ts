import {
  Burn,
  Mint,
  Pool,
  Swap,
  Tx,
} from "../model";

import { StoreWithCache } from "@belopash/typeorm-store";
import { ProcessorContext, Log } from "../processor";
import * as poolAbi from "../abi/pool";
import { TaskQueue } from '../utils/queue';
import { createTransaction } from "../utils/entityCreationCallbacks";
  
type PairsMappingContext = ProcessorContext<StoreWithCache> & { queue: TaskQueue};
  
export function handleInitialize(
  mctx: PairsMappingContext,
  log: Log
) {
  let {tick, sqrtPriceX96} = poolAbi.events.Initialize.decode(log);

  mctx.store.defer(Pool, log.address);

  mctx.queue.add(async () => {
    const pool = await mctx.store.getOrFail(Pool, log.address);
    pool.initialTick = tick;
    pool.initialSqrtPriceX96 = sqrtPriceX96;
    await mctx.store.upsert(pool);
  })
}

export function handleMint(
  mctx: PairsMappingContext,
  log: Log
) {
  let {
    sender,
    owner,
    tickLower,
    tickUpper,
    amount,
    amount0,
    amount1
  } = poolAbi.events.Mint.decode(log);

  mctx.store.defer(Pool, log.address);

  const tx = log.getTransaction()
  mctx.store.defer(Tx, tx.hash);

  mctx.queue.add(async () => {
    const pool = await mctx.store.get(Pool, log.address);
    if (pool == null) return
    
    const mintTx = await mctx.store.getOrInsert(Tx, tx.hash, (id) => createTransaction(id, tx))

    await mctx.store.upsert(new Mint({
      id: log.id,
      transactionHash: mintTx.id,
      transaction: mintTx,
      timestamp: new Date(log.block.timestamp),
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

export function handleBurn(
  mctx: PairsMappingContext,
  log: Log
) {
  let {
    owner,
    tickLower,
    tickUpper,
    amount,
    amount0,
    amount1
  } = poolAbi.events.Burn.decode(log);

  mctx.store.defer(Pool, log.address);
  
  const tx = log.getTransaction()
  mctx.store.defer(Tx, tx.hash);

  mctx.queue.add(async () => {
    const pool = await mctx.store.get(Pool, log.address);
    if (pool == null) return
    
    const burnTx = await mctx.store.getOrInsert(Tx, tx.hash, (id) => createTransaction(id, tx))

    await mctx.store.upsert(new Burn({
      id: log.id,
      transactionHash: burnTx.id,
      transaction: burnTx,
      timestamp: new Date(log.block.timestamp),
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

export function handleSwap(
  mctx: PairsMappingContext,
  log: Log
) {
  let {
    sender,
    recipient,
    amount0,
    amount1,
    sqrtPriceX96,
    liquidity,
    tick
  } = poolAbi.events.Swap.decode(log);

  mctx.store.defer(Pool, log.address);

  const tx = log.getTransaction()
  mctx.store.defer(Tx, tx.hash);

  mctx.queue.add(async () => {
    const pool = await mctx.store.get(Pool, log.address);
    if (pool == null) return
    
    const swapTx = await mctx.store.getOrInsert(Tx, tx.hash, (id) => createTransaction(id, tx))

    await mctx.store.upsert(new Swap({
      id: log.id,
      transactionHash: swapTx.id,
      transaction: swapTx,
      timestamp: new Date(log.block.timestamp),
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