import { mastodon } from "masto";
import Storage from "../Storage";
import { ServerFeature, AccountFeature } from "../types";
export default class FeatureStorage extends Storage {
    static getMostFavoritedAccounts(api: mastodon.rest.Client): Promise<AccountFeature>;
    static getMostRetootedAccounts(api: mastodon.rest.Client): Promise<AccountFeature>;
    static getTopInteracts(api: mastodon.rest.Client): Promise<AccountFeature>;
    static getCoreServer(api: mastodon.rest.Client): Promise<ServerFeature>;
}
