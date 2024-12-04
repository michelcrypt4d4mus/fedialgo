import { mastodon } from "masto";
import Storage from "../Storage";
import { AccountFeature, StringNumberDict, ServerFeature, TootURIs } from "../types";
export default class MastodonApiCache extends Storage {
    static getFollowedAccounts(api: mastodon.rest.Client): Promise<mastodon.v1.Account[]>;
    static getMostFavoritedAccounts(api: mastodon.rest.Client): Promise<AccountFeature>;
    static getRecentToots(api: mastodon.rest.Client): Promise<TootURIs>;
    static getMostRetootedAccounts(api: mastodon.rest.Client): Promise<AccountFeature>;
    static getMostRepliedAccounts(api: mastodon.rest.Client): Promise<StringNumberDict>;
    static getTopInteracts(api: mastodon.rest.Client): Promise<AccountFeature>;
    static getFollowedTags(api: mastodon.rest.Client): Promise<StringNumberDict>;
    static getCoreServer(api: mastodon.rest.Client): Promise<ServerFeature>;
    private static shouldReloadFeatures;
}
