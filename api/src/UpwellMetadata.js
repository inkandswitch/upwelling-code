"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpwellMetadata = void 0;
const Automerge = __importStar(require("automerge-wasm-pack"));
const debug_1 = __importDefault(require("debug"));
const ROOT = "_root";
class UpwellMetadata {
    constructor(doc) {
        this.doc = doc;
    }
    static load(binary) {
        return new UpwellMetadata(Automerge.loadDoc(binary));
    }
    static create(id, main_id) {
        (0, debug_1.default)("creating metadata", id, main_id);
        let doc = Automerge.create();
        doc.set(ROOT, 'id', id);
        doc.set(ROOT, 'main_id', main_id);
        return new UpwellMetadata(doc);
    }
    get id() {
        return this.doc.value(ROOT, 'id')[1];
    }
    get main() {
        return this.doc.value(ROOT, 'main_id')[1];
    }
    set main(id) {
        this.doc.set(ROOT, 'main_id', id);
    }
}
exports.UpwellMetadata = UpwellMetadata;
//# sourceMappingURL=UpwellMetadata.js.map