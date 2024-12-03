/*
 * Base class for Toot scorers.
 */
import { ScorerInfo, Toot } from "../types";


export default class Scorer {
    name: string;
    description: string;
    defaultWeight: number = 1;
    protected _isReady: boolean = false;

    constructor(name: string, description: string, defaultWeight?: number) {
        this.name = name;
        this.description = description;
        this.defaultWeight = defaultWeight ?? this.defaultWeight;
    }

    async score(toot: Toot): Promise<number> {
        this.checkIsReady();
        return await this._score(toot);
    }

    //* _score() should be overloaded in subclasses. *//
    async _score(_toot: Toot): Promise<number> {
        throw new Error("Method not implemented.");
    }

    getInfo(): ScorerInfo {
        return {
            description: this.description,
            defaultWeight: this.defaultWeight,
            scorer: this,
        };
    }

    private checkIsReady(): void {
        if (!this._isReady) {
            const msg = `${this.name} scorer not ready!`;
            console.warn(msg);
            throw new Error(msg);
        }
    }
};
