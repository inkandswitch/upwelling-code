"use strict";
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
exports.Upwell = void 0;
const Layer_1 = require("./Layer");
const UpwellMetadata_1 = require("./UpwellMetadata");
const concat_stream_1 = __importDefault(require("concat-stream"));
const tar_stream_1 = __importDefault(require("tar-stream"));
const nanoid_1 = require("nanoid");
const debug_1 = __importDefault(require("debug"));
const debug = (0, debug_1.default)('Upwell');
const LAYER_EXT = '.layer';
const METADATA_KEY = 'metadata.automerge';
// An Upwell is multiple layers
class Upwell {
    constructor() {
        this._layers = new Map();
    }
    get id() {
        return this.metadata.id;
    }
    rootLayer() {
        let rootId = this.metadata.main;
        return this.layers().find(l => l.id === rootId);
    }
    layers() {
        return Array.from(this._layers.values());
    }
    add(layer) {
        let existing = this.get(layer.id);
        if (existing) {
            // we know about this layer already.
            // merge this layer with our existing layer 
            let merged = Layer_1.Layer.merge(existing, layer);
            this.set(merged.id, merged);
        }
        else {
            this.set(layer.id, layer);
        }
    }
    archive(id) {
        let layer = this.get(id);
        layer.archived = true;
        this.set(id, layer);
    }
    set(id, layer) {
        return this._layers.set(id, layer);
    }
    get(id) {
        return this._layers.get(id);
    }
    toFile() {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve, reject) => {
                let pack = this.serialize();
                let toBinaryStream = (0, concat_stream_1.default)((binary) => {
                    resolve(binary);
                });
                pack.pipe(toBinaryStream);
            });
        });
    }
    static deserialize(stream) {
        return new Promise((resolve, reject) => {
            let upwell = new Upwell();
            let unpackFileStream = (stream, next) => {
                let concatStream = (0, concat_stream_1.default)((buf) => {
                    next(buf);
                });
                stream.on('error', (err) => {
                    console.error(err);
                });
                stream.pipe(concatStream);
                stream.resume();
            };
            let extract = tar_stream_1.default.extract();
            extract.on('entry', (header, stream, next) => {
                if (header.name === METADATA_KEY) {
                    unpackFileStream(stream, (buf) => {
                        upwell.metadata = UpwellMetadata_1.UpwellMetadata.load(buf);
                        next();
                    });
                }
                else {
                    unpackFileStream(stream, (buf) => {
                        let filename = header.name;
                        let id = filename.split('.')[0];
                        var start = new Date();
                        let layer = Layer_1.Layer.lazyLoad(id, buf);
                        //@ts-ignore
                        var end = new Date() - start;
                        debug('(loadDoc): execution time %dms', end);
                        upwell.add(layer);
                        next();
                    });
                }
            });
            extract.on('finish', function () {
                resolve(upwell);
            });
            stream.pipe(extract);
        });
    }
    serialize() {
        let pack = tar_stream_1.default.pack();
        let layers = this.layers();
        layers.forEach(layer => {
            let start = new Date();
            let binary = layer.save();
            //@ts-ignore
            var end = new Date() - start;
            debug('(save): execution time %dms', end);
            pack.entry({ name: `${layer.id}.${LAYER_EXT}` }, Buffer.from(binary));
        });
        pack.entry({ name: METADATA_KEY }, Buffer.from(this.metadata.doc.save()));
        pack.finalize();
        return pack;
    }
    static create(options) {
        let upwell = new Upwell();
        let layer = Layer_1.Layer.create('Document initialized', (options === null || options === void 0 ? void 0 : options.author) || 'Unknown');
        let id = (options === null || options === void 0 ? void 0 : options.id) || (0, nanoid_1.nanoid)();
        upwell.metadata = UpwellMetadata_1.UpwellMetadata.create(id, layer.id);
        upwell.add(layer);
        return upwell;
    }
    merge(other) {
        let layersToMerge = other.layers();
        //merge layers
        layersToMerge.forEach(layer => {
            this.add(layer);
        });
        //merge metadata
        let theirs = other.metadata;
        let ours = this.metadata;
        ours.doc.merge(theirs.doc);
        this.metadata = ours;
    }
}
exports.Upwell = Upwell;
//# sourceMappingURL=Upwell.js.map