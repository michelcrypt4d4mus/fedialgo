import { mastodon } from "masto";
export default function repliedFeature(api: mastodon.rest.Client, user: mastodon.v1.Account, recentToots?: mastodon.v1.Status[]): Promise<Record<string, number>>;
