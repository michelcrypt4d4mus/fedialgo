/*
 * Helpers for time-related operations
 */
import { NULL } from "./string_helpers";

export const SECONDS_IN_MINUTE = 60;
export const SECONDS_IN_HOUR = 3600;
export const SECONDS_IN_DAY = 86400;
const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];


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
        return NULL;
    } else if (typeof date === "string") {
        isoString = new Date(date).toISOString();
    } else {
        isoString = date.toISOString();
    }

    return withMilliseconds ? isoString : isoString.replace(/\.\d+/, "");
};


// Generate a string representing a timestamp.
export const timeString = (timestamp: Date | string | null): string => {
    if (timestamp == null) return NULL;
    timestamp = typeof timestamp == 'string' ? new Date(timestamp) : timestamp;

    if (timestamp.getDate() === new Date().getDate()) {
        return `Today ${timestamp.toLocaleTimeString()}`;
    } else {
        return `${DAY_NAMES[timestamp.getDay()]} ${timestamp.toLocaleTimeString()}`;
    }
};
