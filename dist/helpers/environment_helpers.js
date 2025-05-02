"use strict";
/*
 * Helpers for environment variables
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TRACE_LOG = exports.isDebugMode = void 0;
function isDebugMode() {
    return process.env.DEBUG === "true";
}
exports.isDebugMode = isDebugMode;
;
exports.TRACE_LOG = isDebugMode();
//# sourceMappingURL=environment_helpers.js.map