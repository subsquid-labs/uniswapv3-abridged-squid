import * as factoryAbi from "../abi/factory";
import { Pool } from "../model";
import { FACTORY_ADDRESS } from "../utils/constants";

import { StoreWithCache } from "@belopash/typeorm-store";
import { ProcessorContext, BlockData, Block, Log } from "../processor";

type Task = () => Promise<void>;
type ContextWithPoolQueue = ProcessorContext<StoreWithCache> & { queue: { Pool: Task[] } };

export async function processFactoryData(
  mctx: ContextWithPoolQueue,
  blocks: BlockData[],
  pools: Set<string>
): Promise<void> {

  for (let block of blocks) {
    for (let log of block.logs) {
      if (log.address === FACTORY_ADDRESS && log.topics[0] === factoryAbi.events.PoolCreated.topic) {
        await handlePoolCreated(mctx, block.header, log, pools)
      }
    }
  }
}

async function handlePoolCreated(
  mctx: ContextWithPoolQueue,
  blockHeader: Block,
  log: Log,
  pools: Set<string>
): Promise<void> {

  let {
    token0,
    token1,
    pool: poolAddress,
  } = factoryAbi.events.PoolCreated.decode(log);
  const poolAddressLowerCase = poolAddress.toLowerCase();
  pools.add(poolAddressLowerCase);
  const deferredPool = mctx.store.defer(Pool, poolAddressLowerCase);

  mctx.queue.Pool.push(async () => {
    const pool = await deferredPool.getOrInsert(createNewPool);
    pool.createdAtBlockNumber = blockHeader.height;
    pool.createdAtTimestamp = new Date(blockHeader.timestamp);
    pool.token0Id = token0;
    pool.token1Id = token1;
    await mctx.store.upsert(pool);
  })
}

function createNewPool(address: string): Pool {
  return new Pool({
    id: address
  })
}