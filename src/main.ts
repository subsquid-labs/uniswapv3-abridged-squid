import { StoreWithCache, TypeormDatabaseWithCache } from "@belopash/typeorm-store";
import {
  ProcessorContext,
  preloadedPoolsMetadata,
  processor,
} from "./processor";
import { handlePoolCreated } from "./mappings/factory";
import { handleBurn, handleInitialize, handleMint, handleSwap } from "./mappings/core";
//import { processPositions } from "./mappings/positionManager";
import { Pool } from "./model";
import { In } from "typeorm";
import {TaskQueue} from './utils/queue';
import * as poolAbi from "./abi/pool";
import * as factoryAbi from "./abi/factory";
import {FACTORY_ADDRESS} from './utils/constants';

type MappingContext = ProcessorContext<StoreWithCache> & { queue: TaskQueue };

let isPoolsInitialized = false

processor.run(new TypeormDatabaseWithCache({supportHotBlocks: true}), async (ctx) => {
  if (!isPoolsInitialized) {
    await initializePools(ctx);
    await ctx.store.flush();

    isPoolsInitialized = true
  }

  const mctx: MappingContext = {
    ...ctx,
    queue: new TaskQueue()
  };

  // await processFactoryData(mctx, ctx.blocks);
  // await processPairsData(mctx, ctx.blocks);
  //await processPositions(mctx, ctx.blocks);

  for (let block of mctx.blocks) {
    for (let log of block.logs) {
      if (log.address === FACTORY_ADDRESS && log.topics[0] === factoryAbi.events.PoolCreated.topic) {
        handlePoolCreated(mctx, log)
      } else {
        switch (log.topics[0]) {
          case poolAbi.events.Initialize.topic:
            handleInitialize(mctx, log);
            break;
          case poolAbi.events.Burn.topic:
            handleBurn(mctx, log);
            break;
          case poolAbi.events.Mint.topic:
            handleMint(mctx, log);
            break;
          case poolAbi.events.Swap.topic:
            handleSwap(mctx, log);
            break;
        }
      }
    }
  }

  await mctx.queue.run()

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