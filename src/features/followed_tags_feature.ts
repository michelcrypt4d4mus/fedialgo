/*
 * Compute which accounts this user favorites the most often lately.
 */
import { mastodon } from "masto";

import { Key } from "../Storage";
import { mastodonFetchPages } from "../api/api";
import { StringNumberDict } from "../types";


export default async function FollowedTagsFeature(
    api: mastodon.rest.Client,
    _user: mastodon.v1.Account
): Promise<StringNumberDict> {
    const tags = await mastodonFetchPages<mastodon.v1.Tag>({
        fetchMethod: api.v1.followedTags.list,
        label: Key.FOLLOWED_TAGS
    });

    console.log(`Retrieved followed tags with FollowedTagsFeature():`, tags);

    return tags.reduce((acc, tag) => {
        acc[tag.name.toLowerCase()] = 1;
        return acc;
    }, {} as StringNumberDict);
};
