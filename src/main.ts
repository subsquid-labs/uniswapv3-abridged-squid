import { StoreWithCache, TypeormDatabaseWithCache } from "@belopash/typeorm-store";
import {
  Block,
  Log,
  ProcessorContext,
  preloadedPoolsMetadata,
  processor,
} from "./processor";
import { Pool } from "./model";
import { In } from "typeorm";
import * as factoryAbi from './abi/factory'
import { FACTORY_ADDRESS } from "./utils/constants";

type Task = () => Promise<void>;
type TaskQueue = {
  Pool: Task[]
};
type MappingContext = ProcessorContext<StoreWithCache> & { queue: TaskQueue };

let pools: Set<string> | undefined

processor.run(new TypeormDatabaseWithCache({supportHotBlocks: true}), async (ctx) => {
  const mctx: MappingContext = {
    ...ctx,
    queue: {
      Pool: []   
    }
  };

  if (pools === undefined) {
  //  pools = await initializePools(ctx);
    pools = new Set();
  }
  for (let block of mctx.blocks) {
    for (let log of block.logs) {
      if (log.address === FACTORY_ADDRESS && log.topics[0] === factoryAbi.events.PoolCreated.topic) {
        await handlePoolCreated(mctx, block.header, log, pools)
      }
    }
  }
  await Promise.all(mctx.queue.Pool.map(t => t()));

  console.log(`${pools.size} pools known at the end of the batch`)
  console.log('===== END OF THE BATCH =====')
});

async function initializePools(ctx: ProcessorContext<StoreWithCache>): Promise<Set<string>> {
  let dbPoolRecords = await ctx.store.findBy(Pool, {id: In(preloadedPoolsMetadata.pools)});
  console.log(`Retrieved ${dbPoolRecords.length} pools from the database`)
  let outPools = new Set(dbPoolRecords.map(p => p.id));
  let missingPools = [];
  for (let pp of preloadedPoolsMetadata.pools) {
    if (!outPools.has(pp)) {
      outPools.add(pp);
      missingPools.push(new Pool({ id: pp }));
    }
  }
  await ctx.store.insert(missingPools);
  console.log(`Inserted ${missingPools.length} missing pools`)
  return outPools;
};


async function handlePoolCreated(
  mctx: MappingContext,
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
    let pool = await deferredPool.get();
    if (pool === undefined) {
      console.log(`new pool ${poolAddressLowerCase} is unknown, adding it`)
      pool = new Pool({id: poolAddressLowerCase});
    }
    else {
      console.log(`creation event for a known pool ${poolAddressLowerCase} caught`)
    }
    pool.createdAtBlockNumber = blockHeader.height;
    pool.createdAtTimestamp = new Date(blockHeader.timestamp);
    pool.token0Id = token0;
    pool.token1Id = token1;
    await mctx.store.upsert(pool);
  })
}