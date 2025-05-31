import Toot from '../api/objects/toot';
import { ComponentLogger } from '../helpers/log_helpers';
import { type StringNumberDict, type WeightInfo } from "../types";
import { ScoreName, NonScoreWeightName } from '../enums';
export type WeightName = ScoreName | NonScoreWeightName;
export default abstract class Scorer {
    abstract description: string;
    isReady: boolean;
    logger: ComponentLogger;
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
