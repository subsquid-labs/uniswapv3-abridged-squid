import { StoreWithCache, TypeormDatabaseWithCache } from "@belopash/typeorm-store";
import {
  ProcessorContext,
  preloadedPoolsMetadata,
  processor,
} from "./processor";
import { processFactoryData } from "./mappings/factory";
import { processPairsData } from "./mappings/core";
//import { processPositions } from "./mappings/positionManager";
import { Pool } from "./model";
import { In } from "typeorm";

type Task = () => Promise<void>;
type TaskQueue = {
  Pool: Task[],
  Tx: Task[],
  Mint: Task[],
  Burn: Task[],
  Swap: Task[],
  Collect: Task[],
  Flash: Task[],
};
type MappingContext = ProcessorContext<StoreWithCache> & { queue: TaskQueue };

let pools: Set<string> | undefined

processor.run(new TypeormDatabaseWithCache({supportHotBlocks: true}), async (ctx) => {
  if (pools === undefined) {
    pools = await initializePools(ctx);
    ctx.store.flush();
  }

  const mctx: MappingContext = {
    ...ctx,
    queue: {
      Pool: [],
      Tx: [],
      Mint: [],
      Burn: [],
      Swap: [],
      Collect: [],
      Flash: [],    
    }
  };

  await processFactoryData(mctx, ctx.blocks, pools);
  await processPairsData(mctx, ctx.blocks, pools);
  //await processPositions(mctx, ctx.blocks);

  await Promise.all(mctx.queue.Pool.map(t => t()));
  await Promise.all(mctx.queue.Tx.map(t => t()));
  await Promise.all(mctx.queue.Mint.map(t => t()));
  await Promise.all(mctx.queue.Burn.map(t => t()));
  await Promise.all(mctx.queue.Swap.map(t => t()));
  await Promise.all(mctx.queue.Collect.map(t => t()));
  await Promise.all(mctx.queue.Flash.map(t => t()));

  console.log('===== END OF THE BATCH =====')
});

async function initializePools(ctx: ProcessorContext<StoreWithCache>): Promise<Set<string>> {
  let dbPoolRecords = await ctx.store.findBy(Pool, {id: In(preloadedPoolsMetadata.pools)});
  let outPools = new Set(dbPoolRecords.map(p => p.id));
  let missingPools = [];
  for (let pp of preloadedPoolsMetadata.pools) {
    if (!outPools.has(pp)) {
      outPools.add(pp);
      missingPools.push(new Pool({ id: pp }));
    }
  }
  await ctx.store.insert(missingPools);
  return outPools;
};