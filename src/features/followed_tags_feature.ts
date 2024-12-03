/*
 * Compute which accounts this user favorites the most often lately.
 */
import { mastodon } from "masto";

import { Key } from "../Storage";
import { mastodonFetchPages } from "../helpers";
import { ScoresType } from "../types";


export default async function FollowedTagsFeature(api: mastodon.rest.Client): Promise<ScoresType> {
    const tags = await mastodonFetchPages<mastodon.v1.Tag>({
        fetchMethod: api.v1.followedTags.list,
        label: Key.FOLLOWED_TAGS
    });

    console.log(`Retrieved followed tags with FollowedTagsFeature():`, tags);

    return tags.reduce((acc, tag) => {
        acc[tag.name] = 1;
        return acc;
    }, {} as ScoresType);
};
