"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildNewFilterSettings = exports.buildFiltersFromArgs = exports.DEFAULT_FILTERS = void 0;
/*
 * Helpers for building and serializing a complete set of FeedFilterSettings.
 */
const numeric_filter_1 = __importStar(require("./numeric_filter"));
const property_filter_1 = __importStar(require("./property_filter"));
exports.DEFAULT_FILTERS = {
    feedFilterSectionArgs: [],
    filterSections: {},
    numericFilterArgs: [],
    numericFilters: {},
};
// For building a FeedFilterSettings object from the serialized version. Mutates object.
function buildFiltersFromArgs(serializedFilterSettings) {
    serializedFilterSettings.filterSections ??= {};
    serializedFilterSettings.numericFilters ??= {};
    serializedFilterSettings.feedFilterSectionArgs.forEach((args) => {
        serializedFilterSettings.filterSections[args.title] = new property_filter_1.default(args);
    });
    serializedFilterSettings.numericFilterArgs.forEach((args) => {
        serializedFilterSettings.numericFilters[args.title] = new numeric_filter_1.default(args);
    });
    // Fill in any missing values
    numeric_filter_1.FILTERABLE_SCORES.forEach(weightName => {
        serializedFilterSettings.numericFilters[weightName] ??= new numeric_filter_1.default({ title: weightName });
    });
}
exports.buildFiltersFromArgs = buildFiltersFromArgs;
;
// Build a new FeedFilterSettings object with DEFAULT_FILTERS as the base.
// Start with numeric & type filters. Other PropertyFilters depend on what's in the toots.
function buildNewFilterSettings() {
    // Stringify and parse to get a deep copy of the default filters
    const filters = JSON.parse(JSON.stringify(exports.DEFAULT_FILTERS));
    filters.filterSections[property_filter_1.PropertyName.TYPE] = new property_filter_1.default({ title: property_filter_1.PropertyName.TYPE });
    numeric_filter_1.FILTERABLE_SCORES.forEach(f => filters.numericFilters[f] = new numeric_filter_1.default({ title: f }));
    // console.debug(`Built new FeedFilterSettings:`, filters);
    return filters;
}
exports.buildNewFilterSettings = buildNewFilterSettings;
;
//# sourceMappingURL=feed_filters.js.map