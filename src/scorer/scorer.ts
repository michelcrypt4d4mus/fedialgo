/*
 * Base class for Toot scorers.
 */
import { ScorerInfo, Toot } from "../types";
import { DEFAULT_WEIGHTS } from "../config";
import { WeightName } from "../types";


export default class Scorer {
    name: WeightName;
    description: string;
    defaultWeight: number;
    protected _isReady: boolean = false;

    constructor(name: WeightName) {
        console.log(`Scorer's this.constructor.name: ${this.constructor.name}`);
        this.name = name;
        this.description = DEFAULT_WEIGHTS[name].description;
        this.defaultWeight = DEFAULT_WEIGHTS[name].defaultWeight ?? 1;
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
