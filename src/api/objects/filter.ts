/*
 * Helpers for Mastodon filters.
 */
import { mastodon } from "masto";

import { Logger } from "../../helpers/logger";
import { wordsRegex } from "../../helpers/string_helpers";

const logger = new Logger(`filter.ts`);


export function buildMutedRegex(serverSideFilters: mastodon.v2.Filter[]): RegExp {
    return wordsRegex(extractMutedKeywords(serverSideFilters));
};


export function extractMutedKeywords(serverSideFilters: mastodon.v2.Filter[]): string[] {
    let keywords = serverSideFilters.map(f => f.keywords.map(k => k.keyword)).flat().flat().flat();
    keywords = keywords.map(k => k.toLowerCase().replace(/^#/, ""));
    logger.trace(`<mutedKeywords()> found ${keywords.length} keywords:`, keywords);
    return keywords;
}
