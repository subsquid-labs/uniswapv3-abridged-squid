import {
  IncreaseLiquidity,
  DecreaseLiquidity,
  Collect,
  Transfer,
  Tx
} from "../model";

import { StoreWithCache } from "@belopash/typeorm-store";
import { ProcessorContext, Block, Log } from "../processor";
import * as positionAbi from "../abi/NonfungiblePositionManager";
import { TaskQueue } from '../utils/queue';
import { createTransaction } from "../utils/entityCreationCallbacks";

type PositionMappingContext = ProcessorContext<StoreWithCache> & { queue: TaskQueue};

export function handleIncreaseLiquidity(
  mctx: PositionMappingContext,
  log: Log
): void {
  let {
    tokenId,
    liquidity,
    amount0,
    amount1
  } = positionAbi.events.IncreaseLiquidity.decode(log);
  const txdata = log.getTransaction();
  mctx.store.defer(Tx, txdata.hash);

  mctx.queue.add(async () => {
    const tx = await mctx.store.getOrInsert(Tx, txdata.hash, id => createTransaction(id, txdata));
    await mctx.store.insert(new IncreaseLiquidity({
      id: log.id,
      transactionHash: tx.id,
      transaction: tx,
      timestamp: new Date(log.block.timestamp),
      tokenId,
      liquidity,
      amount0,
      amount1
    }));
  })  
}

export function handleDecreaseLiquidity(
  mctx: PositionMappingContext,
  log: Log
): void {
  let {
    tokenId,
    liquidity,
    amount0,
    amount1
  } = positionAbi.events.DecreaseLiquidity.decode(log);
  const txdata = log.getTransaction();
  mctx.store.defer(Tx, txdata.hash);

  mctx.queue.add(async () => {
    const tx = await mctx.store.getOrInsert(Tx, txdata.hash, id => createTransaction(id, txdata));
    await mctx.store.insert(new DecreaseLiquidity({
      id: log.id,
      transactionHash: tx.id,
      transaction: tx,
      timestamp: new Date(log.block.timestamp),
      tokenId,
      liquidity,
      amount0,
      amount1
    }));
  })  
}

export function handleCollect(
  mctx: PositionMappingContext,
  log: Log
): void {
  let {
    tokenId,
    recipient,
    amount0,
    amount1,
  } = positionAbi.events.Collect.decode(log);
  const txdata = log.getTransaction();
  mctx.store.defer(Tx, txdata.hash);

  mctx.queue.add(async () => {
    const tx = await mctx.store.getOrInsert(Tx, txdata.hash, id => createTransaction(id, txdata));
    await mctx.store.insert(new Collect({
      id: log.id,
      transactionHash: tx.id,
      transaction: tx,
      timestamp: new Date(log.block.timestamp),
      tokenId,
      recipient: recipient.toLowerCase(),
      amount0,
      amount1
    }));
  })  
}

export function handleTransfer(
  mctx: PositionMappingContext,
  log: Log
): void {
  let {
    from,
    to,
    tokenId
  } = positionAbi.events.Transfer.decode(log);
  const txdata = log.getTransaction();
  mctx.store.defer(Tx, txdata.hash);

  mctx.queue.add(async () => {
    const tx = await mctx.store.getOrInsert(Tx, txdata.hash, id => createTransaction(id, txdata));
    await mctx.store.insert(new Transfer({
      id: log.id,
      transactionHash: tx.id,
      transaction: tx,
      timestamp: new Date(log.block.timestamp),
      tokenId,
      from: from.toLowerCase(),
      to: to.toLowerCase()
    }));
  })  
}