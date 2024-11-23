/*
 * Implements a mastodon.Paginator to allow paging through the results of an API call.
 */
import { mastodon } from "masto";


export default class Paginator implements mastodon.Paginator<mastodon.v1.Status[]> {
    currentIndex: number
    data: mastodon.v1.Status[]
    direction: "next" | "prev"

    constructor(data: mastodon.v1.Status[]) {
        this.data = data
        this.currentIndex = 0
        this.direction = "next"
    }

    return(value: PromiseLike<undefined> | undefined): Promise<IteratorResult<mastodon.v1.Status[], undefined>> {
        throw new Error(`Method not implemented. ${value}`);
    }
    [Symbol.asyncIterator](): AsyncIterator<mastodon.v1.Status[], undefined, string | undefined> {
        throw new Error("Method not implemented.");
    }

    then<TResult1 = mastodon.v1.Status[], TResult2 = never>(onfulfilled?: ((value: mastodon.v1.Status[]) => TResult1 | PromiseLike<TResult1>) | null | undefined, onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null | undefined): PromiseLike<TResult1 | TResult2> {
        throw new Error(`Method not implemented. ${onfulfilled} ${onrejected}`);
    }

    async next(): Promise<IteratorResult<mastodon.v1.Status[], undefined>> {
        if (this.currentIndex < this.data.length) {
            const result = this.data.slice(this.currentIndex, this.currentIndex + 10)
            this.currentIndex += 10
            return { value: result, done: false }
        }
        return { value: undefined, done: true }
    }

    getDirection(): "next" | "prev" {
        return this.direction;
    }

    setDirection(direction: "next" | "prev"): mastodon.Paginator<mastodon.v1.Status[], undefined> {
        this.direction = direction;
        return this;
    }

    clone(): mastodon.Paginator<mastodon.v1.Status[], undefined> {
        const clonedPaginator = new Paginator(this.data);
        clonedPaginator.currentIndex = this.currentIndex;
        return clonedPaginator;
    }

    async throw(e?: unknown): Promise<IteratorResult<mastodon.v1.Status[], undefined>> {
        console.error(e);
        return { value: undefined, done: true }
    }

    async *values(): AsyncIterableIterator<mastodon.v1.Status[]> {
        for (const status of this.data) {
            yield [status];
        }
    }
}
