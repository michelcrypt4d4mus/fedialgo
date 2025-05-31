import Toot from '../api/objects/toot';
import { Logger } from '../helpers/logger';
import { ScoreName } from '../enums';
import { type StringNumberDict, type WeightInfo } from "../types";
export default abstract class Scorer {
    abstract description: string;
    isReady: boolean;
    logger: Logger;
    name: ScoreName;
    scoreData: StringNumberDict;
    constructor(name: ScoreName);
    getInfo(): WeightInfo;
    score(toot: Toot): Promise<number>;
    abstract _score(_toot: Toot): Promise<number>;
    static scoreToots(toots: Toot[], isScoringFeed?: boolean): Promise<Toot[]>;
    private static decorateWithScoreInfo;
    private static sumScores;
}
