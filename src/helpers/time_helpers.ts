/*
 * Helpers for time-related operations
 */

export const SECONDS_IN_MINUTE = 60;
export const SECONDS_IN_HOUR = 3600;
export const SECONDS_IN_DAY = 86400;


export function ageInSeconds(date: Date | string): number {
    if (!date) {
        return -1;
    }

    date = typeof date === "string" ? new Date(date) : date;
    return (Date.now() - date.getTime()) / 1000;
};


export function ageOfTimestampInSeconds(timestamp: number): number {
    return (Date.now() - timestamp) / 1000;
};


export function toISOFormat(date: Date | string | null | undefined, withMilliseconds?: boolean): string {
    let isoString: string;

    if (!date) {
        return "<<NULL_TIME>>";
    } else if (typeof date === "string") {
        isoString = new Date(date).toISOString();
    } else {
        isoString = date.toISOString();
    }

    return withMilliseconds ? isoString : isoString.replace(/\.\d+/, "");
};
