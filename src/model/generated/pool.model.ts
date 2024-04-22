import {Entity as Entity_, Column as Column_, PrimaryColumn as PrimaryColumn_, DateTimeColumn as DateTimeColumn_, IntColumn as IntColumn_, StringColumn as StringColumn_, BigIntColumn as BigIntColumn_, OneToMany as OneToMany_} from "@subsquid/typeorm-store"
import {Mint} from "./mint.model"
import {Burn} from "./burn.model"
import {Swap} from "./swap.model"

@Entity_()
export class Pool {
    constructor(props?: Partial<Pool>) {
        Object.assign(this, props)
    }

    @PrimaryColumn_()
    id!: string

    @DateTimeColumn_({nullable: true})
    createdAtTimestamp!: Date | undefined | null

    @IntColumn_({nullable: true})
    createdAtBlockNumber!: number | undefined | null

    @StringColumn_({nullable: true})
    token0Id!: string | undefined | null

    @StringColumn_({nullable: true})
    token1Id!: string | undefined | null

    @IntColumn_({nullable: true})
    initialTick!: number | undefined | null

    @BigIntColumn_({nullable: true})
    initialSqrtPriceX96!: bigint | undefined | null

    @OneToMany_(() => Mint, e => e.pool)
    mints!: Mint[]

    @OneToMany_(() => Burn, e => e.pool)
    burns!: Burn[]

    @OneToMany_(() => Swap, e => e.pool)
    swaps!: Swap[]
}
