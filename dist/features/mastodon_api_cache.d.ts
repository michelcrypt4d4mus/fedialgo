import { mastodon } from "masto";
import Storage from "../Storage";
import { AccountFeature, StringNumberDict, ServerFeature, TootURIs, AccountNames } from "../types";
export default class MastodonApiCache extends Storage {
    static getFollowedAccounts(api: mastodon.rest.Client): Promise<AccountNames>;
    static getMostFavoritedAccounts(api: mastodon.rest.Client): Promise<AccountFeature>;
    static getRecentToots(api: mastodon.rest.Client): Promise<TootURIs>;
    static getMostRetootedAccounts(api: mastodon.rest.Client): Promise<AccountFeature>;
    static getMostRepliedAccounts(api: mastodon.rest.Client): Promise<StringNumberDict>;
    static getTopInteracts(api: mastodon.rest.Client): Promise<AccountFeature>;
    static getFollowedTags(api: mastodon.rest.Client): Promise<StringNumberDict>;
    static getCoreServer(api: mastodon.rest.Client): Promise<ServerFeature>;
    static getTopServerDomains(api: mastodon.rest.Client): Promise<string[]>;
    private static shouldReloadFeatures;
}
