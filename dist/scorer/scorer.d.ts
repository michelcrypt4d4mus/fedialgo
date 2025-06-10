import Toot from '../api/objects/toot';
import { Logger } from '../helpers/logger';
import { ScoreName } from '../enums';
import { type StringNumberDict, type WeightInfo, type Weights } from "../types";
export default abstract class Scorer {
    abstract description: string;
    isReady: boolean;
    logger: Logger;
    name: ScoreName;
    scoreData: StringNumberDict;
    constructor(name: ScoreName);
    getInfo(): WeightInfo;
    reset(): void;
    score(toot: Toot): Promise<number>;
    abstract _score(_toot: Toot): Promise<number>;
    static scoreToots(toots: Toot[], isScoringFeed?: boolean): Promise<Toot[]>;
    /**
     * Check that the weights object contains valid weight names and values.
     * @param weights - Weights object to validate.
     * @throws {Error} If any weight is invalid or missing.
     */
    static validateWeights(weights: Weights): void;
    private static decorateWithScoreInfo;
    private static sumScores;
}
