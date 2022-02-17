/** @jsxImportSource @emotion/react */
import { css } from "@emotion/react/macro";
import React, { useEffect } from "react";
import { Upwell, Author, Layer } from "api";
import ListDocuments, {
  ButtonTab,
  InfoTab,
  sidewaysTabStyle,
  FileTab,
} from "./ListDocuments";
import * as Documents from '../Documents'
import { EditReviewView } from './EditReview'
import UpwellSource from './upwell-source'

type DocumentViewProps = {
  id: string;
  author: Author;
};

type LayerState = {
  text: string;
  title: string;
  layer?: Layer;
  atjsonLayer?: UpwellSource;
};

export default function MaybeDocument(props: DocumentViewProps) {
  let [upwell, setUpwell] = React.useState<Upwell>();

  useEffect(() => {
    console.log('getting upwell')
    Documents.get(props.id).then(( upwell: Upwell) => {
      if (!upwell) return console.error('could not find upwell with id', props.id) 
      Documents.startSaveInterval(upwell, 3000)
      setUpwell(upwell)
    })
    return () => {
      Documents.stopSaveInterval();
    };
  }, [props.id]);
  if (!upwell) return <div>Loading..</div>;
  return <DocumentView upwell={upwell} author={props.author} />;
}

export function DocumentView(props: { upwell: Upwell; author: Author }) {
  const { upwell, author } = props;
  let [state, setState] = React.useState<LayerState>({
    text: "",
    title: "",
  });
  let [layers, setLayers] = React.useState<Layer[]>([]);
  let [root, setRoot] = React.useState<Layer>();

  let [editableLayer, setEditableLayer] = React.useState<Layer>();

  useEffect(() => {
    Documents.subscribe(() => {
      // an external document (on the server) has changed
      render()
    })

    function render() {
      upwell.layers().then((layers: Layer[]) => {
        console.log('layers', layers)
        setLayers(layers);
      });
      upwell.rootLayer().then((root: Layer) => {
        setRoot(root);
      });
    }

    render()

    return () => {
      Documents.unsubscribe()
    }
  }, []);

  /*
  async function open(): Promise<Uint8Array> {
    let [fileHandle] = await showOpenFilePicker();
    const file = await fileHandle.getFile();
    return new Uint8Array(await file.arrayBuffer());
  }

  let onOpenClick = async () => {
    let binary: Uint8Array = await open();
    // this is a hack for demos as of December 21, we probably want to do something
    // totally different
    let layer = Layer.load(binary);
    await upwell.add(layer);
    window.location.href = "/layer/" + layer.id;
  };

  let onDownloadClick = async () => {
    let filename = layer.title + ".up";
    let el = window.document.createElement("a");
    let buf: Uint8Array = layer.save();
    el.setAttribute(
      "href",
      "data:application/octet-stream;base64," + buf.toString()
    );
    el.setAttribute("download", filename);
    el.click();
  };

  let onSyncClick = async () => {
    try {
      setStatus(SYNC_STATE.LOADING);
      await upwell.syncWithServer(layer);
      setState({ title: layer.title, text: layer.text });
      setStatus(SYNC_STATE.SYNCED);
    } catch (err) {
      setStatus(SYNC_STATE.OFFLINE);
    }
  };
  */

  let onLayerClick = (layer: Layer) => {
    // TODO: Blaine Magic
    if (!root) return console.error("no root race condition");
    if (layer.id === root.id) return; // do nothing

    layer.visible = !layer.visible;
    if (layer.visible) {
      setEditableLayer(layer);
      setState({ title: layer.title, text: layer.text });
    } else setState({ title: root.title, text: root.text });
  };

  let onCreateLayer = async () => {
    let message = "Very cool layer";
    // always forking from root layer (for now)
    let root = await upwell.rootLayer();
    let newLayer = root.fork(message, author);
    await upwell.persist(newLayer);
    setLayers(await upwell.layers());
    Documents.save(upwell);
  };

  let mergeVisible = async () => {
    if (!root) return console.error("no root race condition");

    let visible = layers.filter((l) => l.visible);
    if (!root) return console.error("could not find root layer");
    let merged = visible.reduce((prev: Layer, cur: Layer) => {
      if (cur.id !== root?.id) {
        upwell.archive(cur.id);
        console.log("archiving", cur.id);
      }
      return Layer.merge(prev, cur);
    }, root);
    await upwell.add(merged);
    setLayers(await upwell.layers());
    setState({ title: merged.title, text: merged.text });
    Documents.save(upwell);
  };

  return (
    <div
      id="folio"
      css={css`
        height: 100vh;
        display: flex;
        flex-direction: row;
        padding: 30px;
        background: url("/wood.png");
      `}
    >
      <div
        id="writing-zone"
        css={css`
          flex: 1 0 auto;
          padding: 20px 40px 40px;
          padding-right: 20px;
          background: #ccecc1;
          border-radius: 10px;
          display: flex;
          flex-direction: row;
        `}
      >
       <EditReviewView upwell={upwell} editableLayer={editableLayer} ></EditReviewView>
       <div
          id="right-side"
          css={css`
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            align-items: flex-start;
          `}
        >
          <div
            id="top"
            css={css`
              margin-top: -17px;
              display: flex;
              flex-direction: column;
              flex: 1 1 auto;
              overflow: auto;
            `}
          >
            <InfoTab css={css``} title="Layers area">
              🌱
            </InfoTab>
            <ButtonTab onClick={onCreateLayer} title="new layer">
              ➕
            </ButtonTab>
            {root && (
              <ListDocuments
                onLayerClick={onLayerClick}
                layers={layers.filter(
                  (l: Layer) => !l.archived && !l.shared && l.id !== root?.id
                )}
                handleShareClick={(l: Layer) => {
                  l.shared = true;
                  upwell.persist(l);
                }}
                editableLayer={editableLayer}
              />
            )}
          </div>
          <div
            id="bottom"
            css={css`
              margin-bottom: -20px;
            `}
          >
            {root && (
              <>
                <ListDocuments
                  onLayerClick={onLayerClick}
                  layers={layers.filter(
                    (l: Layer) => !l.archived && l.shared && l.id !== root?.id
                  )}
                  handleShareClick={(l: Layer) => (l.shared = true)}
                  editableLayer={editableLayer}
                />
                <div css={sidewaysTabStyle}>
                  <FileTab
                    css={css`
                      margin-top: 0;
                      border-radius: 0 10px 10px 0; /* top rounded edges */
                    `}
                    key={root.id}
                    index={1}
                    aria-pressed={root.visible}
                    title={`by ${root.author} at ${root.time.toDateString()}`}
                  >
                    root
                    {/* TODO add author and time  */}
                  </FileTab>
                </div>
              </>
            )}
            <InfoTab css={css``} title="Published area">
              🎂
            </InfoTab>
          </div>
        </div>
        <div
          id="bottom-bar"
          css={css`
            position: absolute;
            bottom: 40px;
            right: 88px;
          `}
        >
          <Button onClick={mergeVisible}>Flatten visible</Button>
        </div>
      </div>
    </div>
  );
}

type ButtonType = React.ClassAttributes<HTMLButtonElement> &
  React.ButtonHTMLAttributes<HTMLButtonElement>;

function Button(props: ButtonType) {
  return (
    <button
      css={css`
        padding: 3px 14px;
        font-size: 14px;
        border-radius: 3px;
        border: none;
        font-weight: 500;
        cursor: pointer;
        display: inline-flex;
        flex-direction: row;
        align-items: center;
        justify-content: center;
        background: white;
        color: black;
        &:hover {
          background: #d1eaff;
        }
        &:disabled {
          opacity: 70%;
          cursor: not-allowed;
          filter: grayscale(40%) brightness(90%);
        }
      `}
      {...props}
    />
  );
}
