"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config_1 = require("../config");
class Scorer {
    name;
    description;
    defaultWeight;
    _isReady = false;
    constructor(name) {
        console.log(`Scorer's this.constructor.name: ${this.constructor.name}`);
        this.name = name;
        this.description = config_1.DEFAULT_WEIGHTS[name].description;
        this.defaultWeight = config_1.DEFAULT_WEIGHTS[name].defaultWeight ?? 1;
    }
    async score(toot) {
        this.checkIsReady();
        return await this._score(toot);
    }
    //* _score() should be overloaded in subclasses. *//
    async _score(_toot) {
        throw new Error("Method not implemented.");
    }
    getInfo() {
        return {
            description: this.description,
            defaultWeight: this.defaultWeight,
            scorer: this,
        };
    }
    checkIsReady() {
        if (!this._isReady) {
            const msg = `${this.name} scorer not ready!`;
            console.warn(msg);
            throw new Error(msg);
        }
    }
}
exports.default = Scorer;
;
//# sourceMappingURL=scorer.js.map