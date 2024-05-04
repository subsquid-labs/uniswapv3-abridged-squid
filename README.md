[![Open in Gitpod](https://gitpod.io/button/open-in-gitpod.svg)](https://gitpod.io/#https://github.com/subsquid-labs/uniswapv3-abridged-squid)

# Simplified Uniswap V3 indexer with caching store

This [squid](https://docs.subsquid.io/sdk/overview/) indexer keeps track of a variety of events emitted by Uniswap V3 smart contracts (used by [the app](https://app.uniswap.org)) on Ethereum. It is an abridged and modernized version of the full-featured [`uniswapv3-squid`](https://github.com/subsquid-labs/uniswapv3-squid), showcasing the new squid architecture based on [`@belopash/typeorm-store`](https://github.com/belopash/squid-typeorm-store). It employs [two-pass indexing](https://docs.subsquid.io/sdk/resources/evm/factory-contracts/#two-pass-indexing-for-factory-contracts), automated [batching](https://docs.subsquid.io/sdk/resources/basics/batch-processing/) and caching (see [Optimizations](#optimizations)).

## Quickstart

**Dependencies: Node.js, Git, Docker.**

Here are the bare-bones commands for running the squid:

```bash
# 1. Retrieve the example
git clone https://github.com/subsquid-labs/uniswapv3-abriged-squid
cd uniswapv3-abridged-squid

# 2. Install dependencies
npm ci

# 3. Build the project
npm run build

# 4. (optional) Update the list of pools
node -r dotenv/config lib/tools/poolsRetriever.js

# 5. Start a Postgres database container
docker compose up -d

# 6. Start the squid processor
node -r dotenv/config lib/main.js

# 7. (in a separate terminal) Start the GraphQL server
npx squid-graphql-server
```
You can also use the supplied [`sqd` shortcuts](https://docs.subsquid.io/squid-cli/commands-json/) from `commands.json` to simplify the workflow. After installing `sqd` with
```bash
npm i -g @subsquid/cli
```
the above simplifies to
```bash
sqd init my_squid_name -t https://github.com/subsquid-labs/uniswapv3-abridged-squid
cd my_squid_name
npm ci
sqd get-pools # optional
sqd up
sqd process &
sqd serve
```
GraphiQL playground will be available at [localhost:4350/graphql](http://localhost:4350/graphql) once the database and the GraphQL server are started.

## About this squid

### Data

The squid captures the following events from all Uniswap V3 Ethereum pools (~22k contracts):

 * `Swap(address,address,int256,int256,uint160,uint128,int24)`
 * `Burn(address,int24,int24,uint128,uint256,uint256)`
 * `Mint(address,int24,int24,uint128,uint256,uint256)`
 * `Initialize(uint160,int24)`

The list of pools valid up to a certain block height is preloaded from `./assets/pools.json`, then maintained dynamically by listening to `PoolCreated` events emitted by the [Uniswap V3 Factory](https://etherscan.io/address/0x1f98431c8ad98523631ae4a59f267346ea31f984) contract. The `pools.json` file can be updated using a specialized mini-squid located at `./src/tools/poolRetriever.ts`. See [Optimizations](#optimizations) for details.

Additionally, the following events from the [NFT position manager contract](https://etherscan.io/address/0xc36442b4a4522e871399cd717abdd847ab11fe88) are captured and recorded:

 * `IncreaseLiquidity(uint256,uint128,uint256,uint256)`
 * `DecreaseLiquidity(uint256,uint128,uint256,uint256)`
 * `Collect(uint256,address,uint256,uint256)`
 * `Transfer(address,address,uint256)`

### Optimizations

This squid uses a couple of optimizations commonly useful when indexing DEXes:

1. The first optimization has to do with the fact that the set of pools is constrantly changing, and Subsquid currently does not offer a way to change the set of contracts being indexed at runtime. The [common workaround](https://docs.subsquid.io/sdk/resources/evm/factory-contracts/) is to retrieve all events with matching signatures network-wide, then filter them using a dynamically updated set of pools. The amount of data in all events mathing `Swap(...)` on Ethereum is large, so syncing performance of such squids is commonly bottlenecked by the bandwidth of the Subsquid Network gateway.

   To reduce the amount of data downloaded, this squid uses a preloaded set of pools valid up to a certain block. For this block range, the processor requests only the events from these known contracts; afterwards it falls back to the network-wide subscription.

   The pools data is preloaded to `./assets/pools.json` using a separate mini-squid `./src/tools/poolRetriever.ts`. Since the operator has to run the mini-squid first, this approach has become known as [two-pass indexing](https://docs.subsquid.io/sdk/resources/evm/factory-contracts/#two-pass-indexing-for-factory-contracts). As long as the `./assets/pools.json` file is stored with the squid, one can re-run the mini-squid only once in a while, specifically when the network advances far enough for the impact of the extra data retrieved near the chain head to be noticeable.

2. The second optimization partially addresses the database IO bottleneck that occurs once the first optimization is applied.

   Since the [GraphQL schema](schema.graphql) uses lots of [entity relations](https://docs.subsquid.io/sdk/reference/schema-file/entity-relations/) and these map to foreign key columns in the database, this squid frequently reads a row from one database table before using its primary key to write a row to another table. For optimal sync performance both reads and writes have to be [batched](https://docs.subsquid.io/sdk/resources/basics/batch-processing/). In simple squids this is usually [done manually](https://docs.subsquid.io/sdk/tutorials/bayc/step-two-deriving-owners-and-tokens/), but that quickly becomes tedious as the schema grows.

   In this squid, this is solved by using the [`@belopash/typeorm-store`](https://docs.subsquid.io/external-tools/#belopashtypeorm-store) package that handles the batching automatically. This allows writing much simpler code with units similar to event handlers employed in subgraphs, without any performance penalties. The tool also caches some database rows in memory and omits the useless database queries on cache hits.

### TBA

Features listed here are available in the full [`uniswapv3-squid`](https://github.com/subsquid-labs/uniswapv3-squid), but not in this abridged version:
 * USD prices conversion
 * [Contract state queries](https://docs.subsquid.io/sdk/resources/tools/typegen/state-queries/?typegen=evm) for obtaining certain data on fees
 * Data aggregations

## Further reading

 * [Squid SDK overview](https://docs.subsquid.io/sdk/overview/): comprehensive list of the available squid components with short descriptions.
 * [Indexer from scratch](https://docs.subsquid.io/sdk/how-to-start/squid-from-scratch/): a short tutorial that shows how squid components are typically combined.
 * [Development flow](https://docs.subsquid.io/sdk/how-to-start/squid-development/): a comprehansive guide into squid development with references to all required resources.
 * [Best practices](https://docs.subsquid.io/cloud/resources/best-practices/): everything you need to know before deploying your squid to production. We recommend that you take a look at that page regardless of whether you deploy to [Subsquid Cloud](https://docs.subsquid.io/cloud/) or self-host.
