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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Layer = exports.loadForTheFirstTimeLoL = void 0;
const nanoid_1 = require("nanoid");
const automerge_wasm_pack_1 = __importDefault(require("automerge-wasm-pack"));
const automerge_wasm_pack_2 = require("automerge-wasm-pack");
const Diff = __importStar(require("diff"));
function loadForTheFirstTimeLoL() {
    return __awaiter(this, void 0, void 0, function* () {
        return new Promise((resolve, reject) => {
            (0, automerge_wasm_pack_1.default)().then(() => {
                resolve();
            });
        });
    });
}
exports.loadForTheFirstTimeLoL = loadForTheFirstTimeLoL;
const ROOT = '_root';
class Layer {
    constructor(doc) {
        this.id = (0, nanoid_1.nanoid)();
        this.doc = doc;
    }
    static lazyLoad(id, buf) {
        let layer = new Layer();
        layer.binary = buf;
        layer.id = id;
        return layer;
    }
    hydrate() {
        if (this.doc)
            return;
        if (!this.binary)
            throw new Error('can only hydrate from a binary!');
        this.doc = (0, automerge_wasm_pack_2.loadDoc)(this.binary);
    }
    _getAutomergeText(prop) {
        this.hydrate();
        let value = this.doc.value(ROOT, prop);
        if (value && value[0] === 'text')
            return this.doc.text(value[1]);
        else
            return '';
    }
    _getValue(prop) {
        this.hydrate();
        let value = this.doc.value(ROOT, prop, this.heads);
        if (value && value[0])
            return value[1];
    }
    get shared() {
        return this._getValue('shared');
    }
    set shared(value) {
        this.doc.set(ROOT, 'shared', value);
    }
    get version() {
        return this._getValue('version');
    }
    set version(value) {
        this.doc.set(ROOT, 'version', value);
    }
    get time() {
        return this._getValue('time');
    }
    set time(value) {
        this.doc.set(ROOT, 'time', value);
    }
    get message() {
        return this._getValue('message');
    }
    set message(value) {
        this.doc.set(ROOT, 'message', value);
    }
    get text() {
        return this._getAutomergeText('text');
    }
    get author() {
        return this._getValue('author');
    }
    get title() {
        return this._getAutomergeText('title');
    }
    get parent_id() {
        return this._getValue('parent_id');
    }
    get archived() {
        return this._getValue('archived');
    }
    set archived(value) {
        this.doc.set(ROOT, 'archived', value);
    }
    checkout(heads) {
        this.heads = heads;
    }
    get metadata() {
        return {
            id: this.id,
            message: this.message,
            author: this.author,
            parent_id: this.parent_id,
            archived: this.archived,
            shared: this.shared
        };
    }
    subscribe(subscriber) {
        this.subscriber = subscriber;
    }
    getEdits(other) {
        this.hydrate();
        let ours = this.text;
        let theirs = other.text;
        let diffs = Diff.diffWordsWithSpace(ours, theirs);
        let idx = 0;
        return diffs.map(d => {
            let type;
            if (d.added) {
                type = 'insert';
            }
            else if (d.removed) {
                type = 'delete';
            }
            else {
                type = 'retain';
            }
            let currIdx = idx;
            if (type === 'insert' || type === 'retain')
                idx = currIdx + d.value.length;
            return {
                type,
                start: currIdx,
                value: d.value
            };
        });
    }
    insertAt(position, value, prop = 'text') {
        this.hydrate();
        let obj = this.doc.value(ROOT, prop);
        if (obj && obj[0] === 'text')
            return this.doc.splice(obj[1], position, 0, value);
        else
            throw new Error('Text field not properly initialized');
    }
    deleteAt(position, count = 1, prop = 'text') {
        this.hydrate();
        let obj = this.doc.value(ROOT, prop);
        if (obj && obj[0] === 'text')
            return this.doc.splice(obj[1], position, count, '');
        else
            throw new Error('Text field not properly initialized');
    }
    mark(name, range, value, prop = 'text') {
        this.hydrate();
        let obj = this.doc.value(ROOT, prop);
        if (obj && obj[0] === 'text')
            return this.doc.mark(obj[1], range, name, value);
        else
            throw new Error('Text field not properly initialized');
    }
    getMarks(prop = 'text') {
        this.hydrate();
        let obj = this.doc.value(ROOT, 'text');
        if (obj && obj[0] === 'text')
            return this.doc.raw_spans(obj[1]);
        else
            throw new Error('Text field not properly initialized');
    }
    get marks() {
        return this.getMarks();
    }
    save() {
        return this.doc.save();
    }
    fork(message, author) {
        this.hydrate();
        let doc = this.doc.fork();
        doc.set(ROOT, 'message', message);
        doc.set(ROOT, 'author', author);
        doc.set(ROOT, 'shared', false);
        doc.set(ROOT, 'time', Date.now());
        doc.set(ROOT, 'archived', false);
        doc.set(ROOT, 'parent_id', this.id);
        return new Layer(doc);
    }
    static merge(ours, theirs) {
        ours.hydrate();
        theirs.hydrate();
        let changes = theirs.doc.getChanges(ours.doc.getHeads());
        ours.doc.applyChanges(changes);
        return ours;
    }
    static mergeWithEdits(ours, theirs) {
        ours.hydrate();
        theirs.hydrate();
        let edits = ours.getEdits(theirs);
        let newLayer = Layer.merge(ours.fork('Merge', ours.author), theirs);
        edits.forEach((edit) => {
            if (edit.type === 'retain')
                return;
            let start = edit.start;
            let end;
            if (edit.type === 'delete') {
                end = edit.start;
            }
            else if (edit.type === 'insert') {
                end = edit.start + edit.value.length;
            }
            newLayer.mark(edit.type, `[${start}..${end}]`, JSON.stringify({
                author: theirs.author,
                text: edit.value
            }));
        });
        newLayer.commit('Merge');
        return newLayer;
    }
    static load(id, binary) {
        let doc = (0, automerge_wasm_pack_2.loadDoc)(binary);
        let layer = new Layer(doc);
        layer.id = id;
        return layer;
    }
    static create(message, author) {
        let doc = (0, automerge_wasm_pack_2.create)();
        doc.set(ROOT, 'message', message);
        doc.set(ROOT, 'author', author);
        doc.set(ROOT, 'shared', false);
        doc.set(ROOT, 'time', Date.now());
        doc.set(ROOT, 'archived', false);
        doc.make(ROOT, 'title', automerge_wasm_pack_2.TEXT);
        doc.make(ROOT, 'text', automerge_wasm_pack_2.TEXT);
        return new Layer(doc);
    }
    commit(message) {
        this.hydrate();
        let meta = { author: this.author, message };
        let heads = this.doc.commit(JSON.stringify(meta));
        if (this.subscriber)
            this.subscriber(this, heads);
        return heads;
    }
}
exports.Layer = Layer;
//# sourceMappingURL=Layer.js.map