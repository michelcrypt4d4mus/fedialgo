import { Toot } from "../types";
export default class Scorer {
    name: string;
    description: string;
    defaultWeight: number;
    protected _isReady: boolean;
    constructor(name: string, description: string, defaultWeight?: number);
    score(toot: Toot): Promise<number>;
    _score(_toot: Toot): Promise<number>;
    private checkIsReady;
}
