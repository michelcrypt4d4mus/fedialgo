/*
 * Helper class to track hashtags that have been suppressed due to non-Latin script language.
 */
import { incrementCount, sumArray, sumValues } from "./collection_helpers";
import { type Logger } from "./logger";
import { type StringNumberDict, type TagWithUsageCounts } from "../types";

type DictOfDicts = Record<string, StringNumberDict>;


class SuppressedHashtags {
    hashtagCounts: DictOfDicts = {};
    wasLogged: boolean = false;

    increment(tag: TagWithUsageCounts): void {
        if (!tag.language) return;
        this.hashtagCounts[tag.language] ||= {};
        incrementCount(this.hashtagCounts[tag.language], tag.name);
        this.wasLogged = false;
    }

    log(logger: Logger): void {
        if (!Object.keys(this.hashtagCounts).length || this.wasLogged) return;
        const languageCounts = Object.values(this.hashtagCounts).map(counts => sumValues(counts));
        logger.debug(`Suppressed ${sumArray(languageCounts)} non-Latin hashtags:`, this.hashtagCounts);
    }
};


export const suppressedHashtags = new SuppressedHashtags();
