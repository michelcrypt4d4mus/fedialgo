import { Toot } from "./types";

export const MAX_CONTENT_CHARS = 150;

export const IMAGE = "image";
export const VIDEO = "video";
export const VIDEO_TYPES = ["gifv", VIDEO];
export const MEDIA_TYPES = [IMAGE, ...VIDEO_TYPES];
export const IMAGE_EXTENSIONS = ["jpg", "jpeg", "png"];


export function createRandomString(length: number): string {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let result = "";

    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    return result;
};


// Take the average of an array of numbers, ignoring undefined values
export function average(values: number[]): number | undefined {
    values = values.filter(v => !!v);
    if (values.length == 0) return NaN;
    return values.filter(v => v != undefined).reduce((a, b) => a + b, 0) / values.length;
};


// Return true if uri ends with an image extension like .jpg or .png
export function isImage(uri: string | null | undefined): boolean {
    if (!uri) return false;
    return IMAGE_EXTENSIONS.some(ext => uri.endsWith(ext));
};


// Remove dupes by uniquifying on the toot's URI
export function dedupeToots(toots: Toot[], logLabel: string | undefined = undefined): Toot[] {
    const prefix = logLabel ? `[${logLabel}] ` : '';
    const tootsByURI = groupBy<Toot>(toots, (toot) => toot.uri);

    Object.entries(tootsByURI).forEach(([uri, uriToots]) => {
        if (!uriToots || uriToots.length == 0) return;
        const allTrendingTags = uriToots.flatMap(toot => toot.trendingTags || []);
        const uniqueTrendingTags = [...new Map(allTrendingTags.map((tag) => [tag.name, tag])).values()]

        if (allTrendingTags.length > 0) {
            console.debug(`${prefix}allTags for ${uri}:`, allTrendingTags);
            console.debug(`${prefix}uniqueTags for ${uri}:`, uniqueTrendingTags);
        }

        // Set all toots to have all trending tags so when we uniquify we catch everything
        uriToots.forEach((toot) => {
            toot.trendingTags = uniqueTrendingTags || [];
        });
    });

    const deduped = [...new Map(toots.map((toot: Toot) => [toot.uri, toot])).values()];
    console.log(`${prefix}Removed ${toots.length - deduped.length} duplicate toots leaving ${deduped.length}:`, deduped);
    return deduped;
};


// TODO: Standard Object.groupBy() would require some tsconfig setting that i don't know about
export function groupBy<T>(arr: T[], key: (item: T) => string): Record<string, T[]> {
    return arr.reduce((acc, item) => {
        const group = key(item);
        acc[group] ||= [];
        acc[group].push(item);
        return acc;
    }, {} as Record<string, T[]>);
};
