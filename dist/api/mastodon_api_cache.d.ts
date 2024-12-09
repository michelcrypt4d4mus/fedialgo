import { mastodon } from "masto";
import { Mutex } from 'async-mutex';
import Storage from "../Storage";
import { AccountFeature, AccountNames, StringNumberDict, ServerFeature, TootURIs } from "../types";
export default class MastodonApiCache extends Storage {
    static tagPullMutex: Mutex;
    static getFollowedAccounts(api: mastodon.rest.Client): Promise<AccountNames>;
    static getMostFavoritedAccounts(api: mastodon.rest.Client): Promise<AccountFeature>;
    static getRecentToots(api: mastodon.rest.Client): Promise<TootURIs>;
    static getFollowedTags(api: mastodon.rest.Client): Promise<StringNumberDict>;
    static getMostRetootedAccounts(api: mastodon.rest.Client): Promise<AccountFeature>;
    static getMostRepliedAccounts(api: mastodon.rest.Client): Promise<StringNumberDict>;
    static getMostFrequentlyInteractingUsers(api: mastodon.rest.Client): Promise<AccountFeature>;
    static getCoreServer(api: mastodon.rest.Client): Promise<ServerFeature>;
    static getTopServerDomains(api: mastodon.rest.Client): Promise<string[]>;
    private static getAggregatedData;
    private static shouldReloadFeatures;
}
