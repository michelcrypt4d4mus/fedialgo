/*
 * Helper class to track hashtags that have been suppressed due to non-Latin script language.
 */
import type Toot from "../api/objects/toot";
import { sumValues } from "./collection_helpers";
import { type Logger } from "./logger";
import { type StringNumberDict, type TagWithUsageCounts } from "../types";

type TagTootUris = Record<string, Set<string>>;
type TagLanguageCounts = Record<string, StringNumberDict>;
type TagLanguageToots = Record<string, TagTootUris>;


class SuppressedHashtags {
    languageTagURIs: TagLanguageToots = {};
    lastLoggedCount = 0;

    increment(tag: TagWithUsageCounts, toot: Toot): void {
        if (!tag.language) return;
        this.languageTagURIs[tag.language] ??= {};
        this.languageTagURIs[tag.language][tag.name] ??= new Set<string>();
        this.languageTagURIs[tag.language][tag.name].add(toot.realURI);
    }

    log(logger: Logger): void {
        const numLanguages = Object.keys(this.languageTagURIs).length;
        const totalCount = sumValues(this.languageCounts());

        if (totalCount === this.lastLoggedCount) {
            return; // No change since last log
        }

        logger.debug(
            `Suppressed ${totalCount} non-Latin hashtags in ${numLanguages} languages on ${this.allTootURIs().size} toots:`,
            this.tagLanguageCounts()
        );

        this.lastLoggedCount = totalCount;
    }

    /** Set of all toot URIs that had a suppressed tag. */
    private allTootURIs(): Set<string> {
        return Object.values(this.languageTagURIs).reduce(
            (uris, tagTootURIs: TagTootUris) => {
                Object.values(tagTootURIs).forEach(set => uris = new Set([...uris, ...set]));
                return uris;
            },
            new Set<string>()
        );
    }

    /** Count of tag toots per language. */
    private languageCounts(): StringNumberDict {
        return Object.entries(this.tagLanguageCounts()).reduce(
            (counts, [language, tagCounts]) => {
                counts[language] = sumValues(tagCounts);
                return counts;
            },
            {} as StringNumberDict
        );
    }

    /** Count of tag toots per language / tag. */
    private tagLanguageCounts(): TagLanguageCounts {
        return Object.entries(this.languageTagURIs).reduce(
            (langTagCounts, [language, tootURIs]) => {
                langTagCounts[language] = this.uriCounts(tootURIs);
                return langTagCounts
            },
            {} as TagLanguageCounts
        );
    }

    /** Convert a TagTootUris object to a StringNumberDict w/length of each URI string Set. */
    private uriCounts(tootURIs: TagTootUris): StringNumberDict {
        return Object.entries(tootURIs).reduce((acc, [tag, uris]) => {
            acc[tag] = uris.size;
            return acc;
        }, {} as StringNumberDict);
    }
};


export const suppressedHashtags = new SuppressedHashtags();
