/*
 * Compute which accounts this user favorites the most often lately.
 */
import { mastodon } from "masto";

import { mastodonFetchPages } from "../api/api";
import { StringNumberDict } from "../types";
import { WeightName } from "../types";


export default async function FollowedTagsFeature(
    api: mastodon.rest.Client,
    _user: mastodon.v1.Account
): Promise<StringNumberDict> {
    const tags = await mastodonFetchPages<mastodon.v1.Tag>({
        fetch: api.v1.followedTags.list,
        label: WeightName.FOLLOWED_TAGS
    });

    console.log(`Retrieved followed tags with FollowedTagsFeature():`, tags);

    // Return tags a a dict of the form {tagString: 1}
    return tags.reduce((acc, tag) => {
        acc[tag.name.toLowerCase()] = 1;
        return acc;
    }, {} as StringNumberDict);
};
