import { mastodon } from "masto";
export default function reblogsFeature(api: mastodon.rest.Client, user: mastodon.v1.Account, recentToots?: mastodon.v1.Status[]): Promise<Record<string, number>>;
export declare function getUserRecentToots(api: mastodon.rest.Client, user: mastodon.v1.Account): Promise<mastodon.v1.Status[]>;
