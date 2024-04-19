import {Entity as Entity_, Column as Column_, PrimaryColumn as PrimaryColumn_, ManyToOne as ManyToOne_, Index as Index_, DateTimeColumn as DateTimeColumn_, StringColumn as StringColumn_, BigIntColumn as BigIntColumn_, IntColumn as IntColumn_} from "@subsquid/typeorm-store"
import {Tx} from "./tx.model"
import {Pool} from "./pool.model"

@Entity_()
export class Swap {
    constructor(props?: Partial<Swap>) {
        Object.assign(this, props)
    }

    @PrimaryColumn_()
    id!: string

    @Index_()
    @ManyToOne_(() => Tx, {nullable: true})
    transaction!: Tx

    @DateTimeColumn_({nullable: false})
    timestamp!: Date

    @StringColumn_({nullable: false})
    poolAddress!: string

    @Index_()
    @ManyToOne_(() => Pool, {nullable: true})
    pool!: Pool

    @StringColumn_({nullable: false})
    sender!: string

    @StringColumn_({nullable: false})
    recipient!: string

    @BigIntColumn_({nullable: false})
    amount0!: bigint

    @BigIntColumn_({nullable: false})
    amount1!: bigint

    @BigIntColumn_({nullable: false})
    sqrtPriceX96!: bigint

    @BigIntColumn_({nullable: false})
    liquidity!: bigint

    @IntColumn_({nullable: false})
    tick!: number

    @StringColumn_({nullable: false})
    origin!: string

    @IntColumn_({nullable: true})
    logIndex!: number | undefined | null
}
