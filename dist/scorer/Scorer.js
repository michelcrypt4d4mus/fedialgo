"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class Scorer {
    name;
    description;
    defaultWeight = 1;
    _isReady = false;
    constructor(name, description, defaultWeight) {
        this.name = name;
        this.description = description;
        this.defaultWeight = defaultWeight ?? this.defaultWeight;
    }
    async score(toot) {
        this.checkIsReady();
        return await this._score(toot);
    }
    //* _score() should be overloaded in subclasses. *//
    async _score(_toot) {
        throw new Error("Method not implemented.");
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
//# sourceMappingURL=Scorer.js.map