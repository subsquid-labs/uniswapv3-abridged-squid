import * as factoryAbi from "../abi/factory";
import { Pool } from "../model";

import { StoreWithCache } from "@belopash/typeorm-store";
import { ProcessorContext, Log } from "../processor";
import { TaskQueue } from "../utils/queue";

type ContextWithPoolQueue = ProcessorContext<StoreWithCache> & { queue: TaskQueue };

export function handlePoolCreated(
  mctx: ContextWithPoolQueue,
  log: Log,
) {
  let {
    token0,
    token1,
    pool: poolAddress,
  } = factoryAbi.events.PoolCreated.decode(log);
  const poolAddressLowerCase = poolAddress.toLowerCase();
  mctx.store.defer(Pool, poolAddressLowerCase);

  mctx.queue.add(async () => {
    const pool = await mctx.store.getOrInsert(Pool, poolAddressLowerCase, id => new Pool({ id }));
    pool.createdAtBlockNumber = log.block.height;
    pool.createdAtTimestamp = new Date(log.block.timestamp);
    pool.token0Id = token0;
    pool.token1Id = token1;
    await mctx.store.upsert(pool);
  })
}