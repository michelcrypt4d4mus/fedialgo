"use strict";
/*
 * Helpers for environment variables
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.isProduction = exports.isDebugMode = void 0;
console.log(`[FediAlgo] NODE_ENV:`, process.env.NODE_ENV, `, process.env.DEBUG:`, process.env.DEBUG);
exports.isDebugMode = process.env.DEBUG === "true";
exports.isProduction = process.env.NODE_ENV === "production";
//# sourceMappingURL=environment_helpers.js.map