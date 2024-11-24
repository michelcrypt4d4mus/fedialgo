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
/*
 * Stores the user's preferred weight for each post scorer.
 */
const Storage_1 = __importStar(require("../Storage"));
class WeightsStore extends Storage_1.default {
    static async getScoreWeight(scoreName) {
        const weight = await this.get(Storage_1.Key.WEIGHTS, true, scoreName);
        return weight != null ? weight : { [scoreName]: 1 };
    }
    // Update the persistent storage with a single user weighting
    static async setScoreWeights(weights, scoreName) {
        await this.set(Storage_1.Key.WEIGHTS, weights, true, scoreName);
    }
    static async getUserWeightsMulti(scoreNames) {
        const weights = {};
        for (const scoreName of scoreNames) {
            const weight = await this.getScoreWeight(scoreName);
            weights[scoreName] = weight[scoreName];
        }
        return weights;
    }
    // Update the persistent storage with all user weightings at the same time
    static async setScoreWeightsMulti(weights) {
        for (const scoreName in weights) {
            await this.setScoreWeights({ [scoreName]: weights[scoreName] }, scoreName);
        }
    }
    static async defaultFallback(scoreName, defaultWeight) {
        // If the weight is not set, set it to the default weight
        const weight = await this.get(Storage_1.Key.WEIGHTS, true, scoreName);
        console.debug(`Default ${scoreName} user weight: ${weight} (defaultWeight arg: ${defaultWeight})`);
        if (weight == null) {
            await this.setScoreWeights({ [scoreName]: defaultWeight }, scoreName);
            return true;
        }
        return false;
    }
}
exports.default = WeightsStore;
;
//# sourceMappingURL=weightsStore.js.map