/*
 * Helpers for time-related operations
 */

export function ageInSeconds(date: Date): number {
    return (Date.now() - date.getTime()) / 1000;
};


export function ageOfTimestampInSeconds(timestamp: number): number {
    return (Date.now() - timestamp) / 1000;
};
