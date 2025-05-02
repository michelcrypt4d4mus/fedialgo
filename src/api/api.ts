/*
 * Class to wrap authenticated mastodon API calls to the user's home server (unauthenticated
 * calls are handled by MastodonServer).
 *   - Methods that are prefixed with 'fetch' will always do a remote fetch.
 *   - Methods prefixed with 'get' will attempt to load from the Storage cache before fetching.
 */
import { mastodon } from "masto";
import { Mutex } from 'async-mutex';

import Account from "./objects/account";
import MastodonServer from "./mastodon_server";
import Storage from "../Storage";
import Toot, { earliestTootedAt, mostRecentTootedAt } from './objects/toot';
import { extractDomain, logAndThrowError } from '../helpers/string_helpers';
import { findMinId } from "../helpers/collection_helpers";
import { MastodonID, StorableObj, StorageKey, TrendingTag, UserData, WeightName} from "../types";
import { repairTag } from "./objects/tag";
import { ageInSeconds, inSeconds, quotedISOFmt } from "../helpers/time_helpers";
import { capitalCase } from "change-case";

export const INSTANCE = "instance";
export const LINKS = "links";
export const STATUSES = "statuses";
export const TAGS = "tags";

export const TRACE_LOG = false;
const ACCESS_TOKEN_REVOKED_MSG = "The access token was revoked";
const DEFAULT_BREAK_IF = (pageOfResults: any[], allResults: any[]) => false;

export type ApiMutex = Record<StorageKey | WeightName, Mutex>;
export const MUTEX_WARN_SECONDS = 10;


// Fetch up to maxRecords pages of a user's [whatever] (toots, notifications, etc.) from the API
//   - breakIf: fxn to call to check if we should fetch more pages, defaults to DEFAULT_BREAK_IF()
//   - fetch: the data fetching function to call with params
//   - label: key to use for caching
//   - maxId: optional maxId to use for pagination
//   - maxRecords: optional max number of records to fetch
//   - moar: if true, continue fetching from the max_id found in the cache
//   - skipCache: if true, don't use cached data and don't lock the endpoint mutex when making requests
//   - skipMutex: if true, don't use mutex locks to prevent parallelism mutex when making requests
interface FetchParams<T> {
    fetch: ((params: mastodon.DefaultPaginationParams) => mastodon.Paginator<T[], mastodon.DefaultPaginationParams>),
    label: StorageKey,
    maxId?: string | number,
    maxRecords?: number,
    skipCache?: boolean,
    breakIf?: (pageOfResults: T[], allResults: T[]) => boolean,
    moar?: boolean,
    skipMutex?: boolean,
};


// Singleton class for interacting with the Mastodon API
export class MastoApi {
    api: mastodon.rest.Client;
    user: Account;
    homeDomain: string;
    mutexes: ApiMutex;
    userData?: UserData;  // Preserve user data for the session in the object to avoid having to go to local storage over and over
    static #instance: MastoApi;

    static init(api: mastodon.rest.Client, user: Account): void {
        if (MastoApi.#instance) {
            console.warn("MastoApi instance already initialized...");
            return;
        }

        console.log(`[MastoApi] Initializing MastoApi instance with user:`, user.acct);
        MastoApi.#instance = new MastoApi(api, user);
    };

    public static get instance(): MastoApi {
        if (!MastoApi.#instance) throw new Error("MastoApi wasn't initialized before use!");
        return MastoApi.#instance;
    };

    private constructor(api: mastodon.rest.Client, user: Account) {
        this.api = api;
        this.user = user;
        this.homeDomain = extractDomain(user.url);

        // Initialize mutexes for each key in Key and WeightName
        this.mutexes = {} as ApiMutex;
        for (const key in StorageKey) this.mutexes[StorageKey[key as keyof typeof StorageKey]] = new Mutex();
        for (const key in WeightName) this.mutexes[WeightName[key as keyof typeof WeightName]] = new Mutex();
    };

    // Get the user's home timeline feed (recent toots from followed accounts and hashtags)
    async fetchHomeFeed(numToots?: number, maxId?: string | number): Promise<Toot[]> {
        numToots ||= Storage.getConfig().numTootsInFirstFetch;
        const timelineLookBackMS = Storage.getConfig().maxTimelineHoursToFetch * 3600 * 1000;
        const cutoffTimelineAt = new Date(Date.now() - timelineLookBackMS);
        const logPrefix = `[API ${StorageKey.HOME_TIMELINE}]`;

        const statuses = await this.fetchData<mastodon.v1.Status>({
            fetch: this.api.v1.timelines.home.list,
            label: StorageKey.HOME_TIMELINE,  // TODO: this shouldn't actually cache anything
            maxId: maxId,
            maxRecords: numToots || Storage.getConfig().maxTimelineTootsToFetch,
            skipCache: true,  // always skip the cache for the home timeline
            breakIf: (pageOfResults, allResults) => {
                const oldestTootAt = earliestTootedAt(allResults) || new Date();
                const oldestTootAtStr = quotedISOFmt(oldestTootAt);
                const oldestInPageStr = quotedISOFmt(earliestTootedAt(pageOfResults));
                // console.debug(`${logPrefix} oldest in page: ${oldestInPageStr}, oldest retrieved: ${oldestTootAtStr}`);

                if (oldestTootAt && oldestTootAt < cutoffTimelineAt) {
                    const cutoffStr = quotedISOFmt(cutoffTimelineAt);
                    console.log(`${logPrefix} Halting (oldestToot ${oldestTootAtStr} is before cutoff ${cutoffStr})`);
                    return true;
                }

                return false;
            }
        });

        const toots = await Toot.buildToots(statuses);
        console.log(`${logPrefix} Retrieved ${toots.length} toots (oldest: ${quotedISOFmt(earliestTootedAt(toots))})`);
        return toots;
    };

    async getBlockedAccounts(): Promise<Account[]> {
        const blockedAccounts = await this.fetchData<mastodon.v1.Account>({
            fetch: this.api.v1.blocks.list,
            label: StorageKey.BLOCKED_ACCOUNTS
        });

        return blockedAccounts.map(a => new Account(a));
    };

    // Get toots for the top trending tags via the search endpoint.
    async getRecentTootsForTrendingTags(): Promise<Toot[]> {
        const releaseMutex = await this.mutexes[StorageKey.TRENDING_TAG_TOOTS].acquire()
        const logPrefix = `[API ${StorageKey.TRENDING_TAG_TOOTS}]`;
        const startTime = new Date();

        try {
            let trendingTagToots = await Storage.getToots(StorageKey.TRENDING_TAG_TOOTS);

            if (trendingTagToots?.length && !(await Storage.isDataStale(StorageKey.TRENDING_TAG_TOOTS))) {
                console.debug(`${logPrefix} Loaded ${trendingTagToots.length} from cache ${inSeconds(startTime)}`);
            } else {
                const trendingTags = await MastodonServer.fediverseTrendingTags();
                const tootTags: Toot[][] = await Promise.all(trendingTags.map(tt => this.getTootsForTag(tt)));
                let toots = tootTags.flat();
                Toot.setDependentProps(toots);
                toots = Toot.dedupeToots(toots, StorageKey.TRENDING_TAG_TOOTS);
                toots.sort((a, b) => b.popularity() - a.popularity());

                // Take only the first Config.numTrendingTagsToots of the toots we've assumebled
                const numToots = toots.length;
                trendingTagToots = toots.slice(0, Storage.getConfig().numTrendingTagsToots);
                await Storage.storeToots(StorageKey.TRENDING_TAG_TOOTS, trendingTagToots);
                console.log(`${logPrefix} Using ${trendingTagToots.length} of ${numToots} toots (${inSeconds(startTime)})`, trendingTagToots);
            }

            return trendingTagToots;
        } finally {
            releaseMutex();
        }
    };

    // Get accounts the user is following
    async getFollowedAccounts(): Promise<Account[]> {
        const followedAccounts = await this.fetchData<mastodon.v1.Account>({
            fetch: this.api.v1.accounts.$select(this.user.id).following.list,
            label: StorageKey.FOLLOWED_ACCOUNTS,
            maxRecords: Storage.getConfig().maxFollowingAccountsToPull,
        });

        return followedAccounts.map(a => new Account(a));
    };

    // Get hashtags the user is following
    async getFollowedTags(): Promise<mastodon.v1.Tag[]> {
        const followedTags = await this.fetchData<mastodon.v1.Tag>({
            fetch: this.api.v1.followedTags.list,
            label: StorageKey.FOLLOWED_TAGS
        });

        return (followedTags || []).map(repairTag);
    }

    // Get more notifications, favourites, etc. and store to cache
    async getMore(): Promise<void> {

    }

    // Get all muted accounts (including accounts that are fully blocked)
    async getMutedAccounts(): Promise<Account[]> {
        const mutedAccounts = await this.fetchData<mastodon.v1.Account>({
            fetch: this.api.v1.mutes.list,
            label: StorageKey.MUTED_ACCOUNTS
        });

        const blockedAccounts = await this.getBlockedAccounts();
        return mutedAccounts.map(a => new Account(a)).concat(blockedAccounts);
    };

    // Get an array of Toots the user has recently favourited
    async getRecentFavourites(): Promise<Toot[]> {
        const recentFaves = await this.fetchData<mastodon.v1.Status>({
            fetch: this.api.v1.favourites.list,
            label: StorageKey.FAVOURITED_ACCOUNTS
        });

        return recentFaves.map(t => new Toot(t));
    };

    // Get the user's recent notifications
    async getRecentNotifications(moar?: boolean): Promise<mastodon.v1.Notification[]> {
        return await this.fetchData<mastodon.v1.Notification>({
            fetch: this.api.v1.notifications.list,
            label: StorageKey.RECENT_NOTIFICATIONS,
            moar: moar,
        });
    }

    // Retrieve content based feed filters the user has set up on the server
    // TODO: The generalized method this.fetchData() doesn't work here because it's a v2 endpoint
    async getServerSideFilters(): Promise<mastodon.v2.Filter[]> {
        const releaseMutex = await this.mutexes[StorageKey.SERVER_SIDE_FILTERS].acquire()
        const logPrefix = `[API ${StorageKey.SERVER_SIDE_FILTERS}]`;
        const startTime = new Date();

        try {
            let filters = await Storage.get(StorageKey.SERVER_SIDE_FILTERS) as mastodon.v2.Filter[];

            if (filters && !(await Storage.isDataStale(StorageKey.SERVER_SIDE_FILTERS))) {
                console.debug(`${logPrefix} Loaded ${filters.length} recoreds from cache:`);
            } else {
                filters = await this.api.v2.filters.list();

                // Filter out filters that either are just warnings or don't apply to the home context
                filters = filters.filter(filter => {
                    // Before Mastodon 4.0 Filter objects lacked a 'context' property altogether
                    if (filter.context?.length > 0 && !filter.context.includes("home")) return false;
                    if (filter.filterAction != "hide") return false;
                    return true;
                });

                await Storage.set(StorageKey.SERVER_SIDE_FILTERS, filters);
                console.log(`${logPrefix} Retrieved ${filters.length} records ${inSeconds(startTime)}:`, filters);
            }

            return filters;
        } finally {
            releaseMutex();
        }
    };

    // Retrieve background data about the user that will be used for scoring etc.
    async getUserData(): Promise<UserData> {
        // Use MUTED_ACCOUNTS as a stand in for all user data freshness
        const isDataStale = await Storage.isDataStale(StorageKey.MUTED_ACCOUNTS);
        if (this.userData && !isDataStale) return this.userData;

        const responses = await Promise.all([
            this.getFollowedAccounts(),
            this.getFollowedTags(),
            this.getMutedAccounts(),
            this.getServerSideFilters(),
        ]);

        // Cache a copy here instead of relying on browser storage because this is accessed quite a lot
        this.userData = {
            followedAccounts: Account.buildAccountNames(responses[0]),
            followedTags: responses[1],
            mutedAccounts: Account.buildAccountNames(responses[2]),
            serverSideFilters: responses[3],
        };

        console.debug(`[MastoApi] Constructed UserData object:`, this.userData);
        return this.userData;
    };

    // Get the user's recent toots
    async getUserRecentToots(): Promise<Toot[]> {
        const recentToots = await this.fetchData<mastodon.v1.Status>({
            fetch: this.api.v1.accounts.$select(this.user.id).statuses.list,
            label: StorageKey.RECENT_USER_TOOTS
        });

        return recentToots.map(t => new Toot(t));
    };

    // Uses v2 search API (docs: https://docs.joinmastodon.org/methods/search/) to resolve
    // foreign server toot URI to one on the user's local server.
    //
    // transforms URLs like this: https://fosstodon.org/@kate/114360290341300577
    //                   to this: https://universeodon.com/@kate@fosstodon.org/114360290578867339
    async resolveToot(toot: Toot): Promise<Toot> {
        const tootURI = toot.realURI();
        const urlDomain = extractDomain(tootURI);
        const logPrefix = `[resolveToot()]`;
        console.debug(`${logPrefix} called for`, toot);
        if (urlDomain == this.homeDomain) return toot;
        const lookupResult = await this.api.v2.search.list({q: tootURI, resolve: true});

        if (!lookupResult?.statuses?.length) {
            logAndThrowError(`${logPrefix} got bad result for '${tootURI}'`, lookupResult);
        }

        const resolvedStatus = lookupResult.statuses[0];
        console.debug(`${logPrefix} found resolvedStatus for '${tootURI}:`, resolvedStatus);
        return new Toot(resolvedStatus as mastodon.v1.Status);
    };

    // Does a keyword substring search for toots. Search API can be used to find toots, profiles, or hashtags.
    //   - searchString:  the string to search for
    //   - maxRecords:    the maximum number of records to fetch
    //   - logMsg:        optional description of why the search is being run (for logging only)
    // TODO: Toot.buildToots has NOT been called on these!
    async searchForToots(searchStr: string, maxRecords?: number, logMsg?: string): Promise<Toot[]> {
        maxRecords = maxRecords || Storage.getConfig().defaultRecordsPerPage;
        const query: mastodon.rest.v1.SearchParams = {limit: maxRecords, q: searchStr, type: STATUSES};
        const logPrefix = `[${StorageKey.TRENDING_TAG_TOOTS}] searchForToots` + (logMsg ? ` (${logMsg})` : "") + `:`;
        const startTime = new Date();
        const tootsForQryMsg = `toots for query '${searchStr}'`;
        // console.debug(`${logPrefix} fetching ${tootsForQueryMsg}...`);

        try {
            const searchResult = await this.api.v2.search.list(query);
            const toots = await Toot.buildToots(searchResult.statuses);
            // return await Toot.buildToots(toots); // TODO
            console.debug(`${logPrefix} Retrieved ${toots.length} ${tootsForQryMsg} ${inSeconds(startTime)}`);
            return toots.map(t => new Toot(t));
        } catch (e) {
            this.throwIfAccessTokenRevoked(e, `${logPrefix} Failed to get ${tootsForQryMsg} ${inSeconds(startTime)}`);
            return [];
        }
    };

    // Fetch toots from the tag timeline API. This is a different endpoint than the search API.
    // See https://docs.joinmastodon.org/methods/timelines/#tag
    // TODO: we could use the min_id param to avoid redundancy and extra work reprocessing the same toots
    // TODO: THESE HAVE NOT HAD Theire dependent properties set yet! maybe this whole function belongs in the other one above
    async hashtagTimelineToots(searchStr: string, maxRecords?: number): Promise<Toot[]> {
        maxRecords = maxRecords || Storage.getConfig().defaultRecordsPerPage;
        const logPrefix = `[${StorageKey.TRENDING_TAG_TOOTS_V2}] hashtagTimelineToots():`;
        // console.log(`${logPrefix} hashtagTimelineToots("${searchStr}", maxRecords=${maxRecords}) called`);

        try {
            const toots = await this.fetchData<mastodon.v1.Status>({
                fetch: this.api.v1.timelines.tag.$select(searchStr).list,
                label: StorageKey.TRENDING_TAG_TOOTS_V2,
                maxRecords: maxRecords,
                skipCache: true,
                skipMutex: true,
            });

            console.debug(`${logPrefix} Retrieved ${toots.length} toots for tag '#${searchStr}'`, toots);
            // return await Toot.buildToots(toots); // TODO should this be here?
            return toots.map(t => new Toot(t));
        } catch (e) {
            this.throwIfAccessTokenRevoked(e, `${logPrefix} Failed to get toots for tag '#${searchStr}'`);
            return [];
        }
    };

    // https://neet.github.io/masto.js/interfaces/mastodon.DefaultPaginationParams.html
    private buildParams(maxId?: number | string, limit?: number): mastodon.DefaultPaginationParams {
        limit ||= Storage.getConfig().defaultRecordsPerPage;

        let params: mastodon.DefaultPaginationParams = {
            limit: Math.min(limit, Storage.getConfig().defaultRecordsPerPage),
        };

        if (maxId) params = {...params, maxId: `${maxId}`};
        return params as mastodon.DefaultPaginationParams;
    };

    // Generic Mastodon object fetcher. Accepts a 'fetch' fxn w/a few other args (see FetchParams type)
    // Tries to use cached data first (unless skipCache=true), fetches from API if cache is empty or stale
    // See comment above on FetchParams object for more info about arguments
    private async fetchData<T>(fetchParams: FetchParams<T>): Promise<T[]> {
        fetchParams.maxRecords ||= Storage.getConfig().minRecordsForFeatureScoring;
        let { breakIf, fetch, label, maxId, maxRecords, moar, skipCache, skipMutex } = fetchParams;
        breakIf = breakIf || DEFAULT_BREAK_IF;
        const logPfx = `[API ${label}]`;
        TRACE_LOG && console.debug(`${logPfx} fetchData() called w/params:`, fetchParams);
        if (moar && (skipCache || maxId)) console.warn(`${logPfx} skipCache=true AND moar or maxId set`);
        let pageNumber = 0;
        let rows: T[] = [];

        // Start the timer before the mutex so we can see if the lock is taking too long to acuqire
        // Also skipCache means skip the Mutex. TrendingTagTootsV2 were getting held by only allowing
        // one request to process at a time.
        const startAt = new Date();
        // This possibly caused some issues the first time i tried to unblock trendign toot tags
        const releaseFetchMutex = skipMutex ? null : await this.mutexes[label].acquire();
        // const releaseFetchMutex = await this.mutexes[label].acquire();
        if (ageInSeconds(startAt) > MUTEX_WARN_SECONDS) console.warn(`${logPfx} Mutex ${inSeconds(startAt)}!`);

        try {
            // Check if we have any cached data that's fresh enough to use (and if so return it, unless moar=true.
            if (!skipCache) {
                const cachedRows = await Storage.get(label) as T[];

                if (cachedRows && !(await Storage.isDataStale(label))) {
                    TRACE_LOG && console.debug(`${logPfx} Loaded ${rows.length} cached rows ${inSeconds(startAt)}`);
                    if (!moar) return cachedRows;

                    // IF MOAR!!!! then we want to find the minimum ID in the cached data and do a fetch from that point
                    console.log(`${logPfx} Found ${cachedRows?.length} cached rows, using minId to fetch more`, cachedRows);
                    rows = cachedRows;
                    maxRecords = maxRecords + rows.length;  // Add another unit of maxRecords to # of rows we have now
                    maxId = findMinId(rows as MastodonID[]);
                    console.log(`${logPfx} Found min ID ${maxId} in cache to use as maxId request param`);
                };
            }

            const parms = this.buildParams(maxId, maxRecords)
            TRACE_LOG && console.debug(`${logPfx} Fetching with params:`, parms);

            for await (const page of fetch(parms)) {
                rows = rows.concat(page as T[]);
                pageNumber += 1;
                const recordsSoFar = `have ${rows.length} records so far ${inSeconds(startAt)}`;

                if (rows.length >= maxRecords || breakIf(page, rows)) {
                    let msg = `${logPfx} Completing fetch at page ${pageNumber}`;
                    TRACE_LOG && console.debug(`${msg}, ${recordsSoFar}`);
                    break;
                } else {
                    TRACE_LOG && console.debug(`${logPfx} Retrieved page ${pageNumber} (${recordsSoFar})`);
                }
            }

            if (!skipCache) await Storage.set(label, rows as StorableObj);
        } catch (e) {
            this.throwIfAccessTokenRevoked(e, `${logPfx} fetchData() for ${label} failed ${inSeconds(startAt)}`);
            return rows;
        } finally {
            releaseFetchMutex && releaseFetchMutex();
        }

        return rows;
    };

    // Get latest toots for a given tag and populate trendingToots property
    // Currently uses both the Search API as well as the tag timeline API which have
    // surprising little overlap (~80% of toots are unique)
    //   - shouldDedupe: if true, dedupe the toots before returning them
    private async getTootsForTag(tag: TrendingTag, shouldDedupe?: boolean): Promise<Toot[]> {
        const logPrefix = `[${StorageKey.TRENDING_TAG_TOOTS}] getTootsForTag("${tag.name}"):`;
        const numToots = Storage.getConfig().numTootsPerTrendingTag;

        const [searchToots, tagTimelineToots] = await Promise.all([
            this.searchForToots(tag.name, numToots, 'trending tag'),
            this.hashtagTimelineToots(tag.name, numToots),
        ]);

        // TODO: this is excessive logging, remove it once we've had a chance to inspect results
        // searchToots.forEach(t => console.info(`${logPrefix} SEARCH found: ${t.describe()}`));
        // tagTimelineToots.forEach(t => console.info(`${logPrefix} TIMELINE found: ${t.describe()}`));
        // logTrendingTagResults(logPrefix, "SEARCH", searchToots);
        // logTrendingTagResults(logPrefix, "TIMELINE", tagTimelineToots);
        const tagToots = [...searchToots, ...tagTimelineToots];
        // TODO: none of these toots have had setDependentProperties() called on them yet
        return shouldDedupe ? Toot.dedupeToots(tagToots, StorageKey.TRENDING_TAG_TOOTS) : tagToots;
    };

    // Re-raise access revoked errors so they can trigger a logout() call
    private throwIfAccessTokenRevoked(e: unknown, msg: string): void {
        console.error(`${msg}. Error:`, e);
        if (!(e instanceof Error)) return;

        if (e.message.includes(ACCESS_TOKEN_REVOKED_MSG)) {
            throw e;
        }
    }
};


// TODO: get rid of this eventually
const logTrendingTagResults = (logPrefix: string, searchMethod: string, toots: Toot[]): void => {
    let msg = `${logPrefix} ${capitalCase(searchMethod)} found ${toots.length} toots`;
    msg += ` (oldest=${quotedISOFmt(earliestTootedAt(toots))}, newest=${quotedISOFmt(mostRecentTootedAt(toots))}):`
    console.info(msg);
};
