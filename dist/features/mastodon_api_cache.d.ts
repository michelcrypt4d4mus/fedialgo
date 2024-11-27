import { mastodon } from "masto";
import Storage from "../Storage";
import { AccountFeature, ScoresType, ServerFeature, TagFeature, TootURIs } from "../types";
export default class MastodonApiCache extends Storage {
    static getMostFavoritedAccounts(api: mastodon.rest.Client): Promise<AccountFeature>;
    static getRecentToots(api: mastodon.rest.Client): Promise<TootURIs>;
    static getMostRetootedAccounts(api: mastodon.rest.Client): Promise<AccountFeature>;
    static getMostRepliedAccounts(api: mastodon.rest.Client): Promise<ScoresType>;
    static getTopInteracts(api: mastodon.rest.Client): Promise<AccountFeature>;
    static getFollowedTags(api: mastodon.rest.Client): Promise<TagFeature>;
    static getCoreServer(api: mastodon.rest.Client): Promise<ServerFeature>;
}
