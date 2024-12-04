import { mastodon } from "masto";
import Storage, { Key } from "../Storage";
import { AccountFeature, AccountNames, StringNumberDict, ServerFeature, TootURIs } from "../types";
export default class MastodonApiCache extends Storage {
    static getFollowedAccounts(api: mastodon.rest.Client): Promise<AccountNames>;
    static getMostFavoritedAccounts(api: mastodon.rest.Client): Promise<AccountFeature>;
    static getRecentToots(api: mastodon.rest.Client): Promise<TootURIs>;
    static getFollowedTags(api: mastodon.rest.Client): Promise<StringNumberDict>;
    static getMostRetootedAccounts(api: mastodon.rest.Client): Promise<AccountFeature>;
    static getMostRepliedAccounts(api: mastodon.rest.Client): Promise<StringNumberDict>;
    static getTopInteracts(api: mastodon.rest.Client): Promise<AccountFeature>;
    static getAggregatedData<T>(api: mastodon.rest.Client, storageKey: Key, fetchMethod: (api: mastodon.rest.Client, user: mastodon.v1.Account, ...args: any | null) => Promise<T>, extraArg?: any | null): Promise<T>;
    static getCoreServer(api: mastodon.rest.Client): Promise<ServerFeature>;
    static getTopServerDomains(api: mastodon.rest.Client): Promise<string[]>;
    private static shouldReloadFeatures;
}
