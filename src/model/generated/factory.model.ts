import {Entity as Entity_, Column as Column_, PrimaryColumn as PrimaryColumn_} from "@subsquid/typeorm-store"

@Entity_()
export class Factory {
    constructor(props?: Partial<Factory>) {
        Object.assign(this, props)
    }

    @PrimaryColumn_()
    id!: string
}
