import { mastodon } from "masto";
import Toot from '../api/objects/toot';
export default function getHomeFeed(api: mastodon.rest.Client, numToots?: number, maxId?: string | number): Promise<Toot[]>;
