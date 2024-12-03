import { mastodon } from "masto";
import { ScoresType } from "../types";
export default function FollowedTagsFeature(api: mastodon.rest.Client): Promise<ScoresType>;
