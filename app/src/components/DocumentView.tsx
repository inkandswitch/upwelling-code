/** @jsxImportSource @emotion/react */
import { css } from "@emotion/react/macro";
import React, { useEffect } from "react";
import { Upwell, Author, Layer } from "api";
import ListDocuments, { ButtonTab, InfoTab } from "./ListDocuments";
import Documents from '../Documents'

let upwell: Upwell = Documents()

type DocumentViewProps = {
  id: string;
  author: Author;
};

type LayerState = {
  text: string;
  title: string;
};

export default function DocumentView(props: DocumentViewProps) {
  const { author } = props;
  let [state, setState] = React.useState<LayerState>({
    text: '',
    title: '',
  });
  let [layers, setLayers] = React.useState<Layer[]>([]);
  let [root, setRoot] = React.useState<Layer>();
  let [editableLayer, setEditableLayer] = React.useState<Layer>();

  useEffect(() => {
    upwell.layers().then((layers: Layer[]) => {
      setLayers(layers);
    });
    upwell.rootLayer().then((root: Layer) => {
      setRoot(root)
    })
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
    if (!root) return console.error('no root race condition')
    if (layer.id === root.id) return  // do nothing

    layer.visible = !layer.visible;
    if (layer.visible) {
      setEditableLayer(layer)
      setState({ title: layer.title, text: layer.text });
    }
    else setState({ title: root.title, text: root.text });
  };

  let onCreateLayer = async () => {
    let message = "Very cool layer";
    // always forking from root layer (for now)
    let root = await upwell.rootLayer()
    let newLayer = root.fork(message, author);
    await upwell.persist(newLayer);
    setLayers(await upwell.layers());
  };

  let mergeVisible = async () => {
    if (!root) return console.error('no root race condition')

    let visible = layers.filter((l) => l.visible);
    if (!root) return console.error('could not find root layer')
    let merged = visible.reduce((prev: Layer, cur: Layer) => {
      if (cur.id !== root?.id) {
        upwell.archive(cur.id)
        console.log('archiving', cur.id)
      }
      return Layer.merge(prev, cur)
    }, root)
    await upwell.add(merged)
    setLayers(await upwell.layers())
    setState({ title: merged.title, text: merged.text });
  };

  function onTextChange(
    e: React.ChangeEvent<HTMLTextAreaElement>,
    key: string
  ) {
    if (editableLayer) {
      e.preventDefault();
      // @ts-ignore
      switch (e.nativeEvent.inputType) {
        case "insertText":
          //@ts-ignore
          editableLayer.insertAt(e.target.selectionEnd - 1, e.nativeEvent.data, key);
          break;
        case "deleteContentBackward":
          editableLayer.deleteAt(e.target.selectionEnd, key);
          break;
        case "insertLineBreak":
          editableLayer.insertAt(e.target.selectionEnd - 1, "\n", key);
          break;
      }
      setState({ title: editableLayer.title, text: editableLayer.text });
      upwell.persist(editableLayer);
    }
  }

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
          padding: 20px 40px;
          padding-right: 20px;
          background: #ccecc1;
          border-radius: 10px;
          display: flex;
          flex-direction: row;
        `}
      >
        <div
          css={css`
            width: 100%;
          `}
        >
          {/* <textarea className="title" value={state.title} onChange={(e) => onTextChange(e, 'title')}></textarea> */}
          <textarea
            css={css`
              width: 100%;
              height: 100%;
              border: 1px solid lightgray;
              border-width: 0 1px 1px 0;
              padding: 34px;
              resize: none;
              font-size: 16px;
              line-height: 20px;
              border-radius: 3px;

              background-image: radial-gradient(#dfdfe9 1px, #ffffff 1px);
              background-size: 20px 20px;
              background-attachment: local;

              :focus-visible {
                outline: 0;
              }
            `}
            className="text"
            value={state.text}
            onChange={(e) => onTextChange(e, "text")}
          ></textarea>
        </div>
        <div
          id="right-side"
          css={css`
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            align-items: flex-start;
          `}
        >
          <div id="top" css={css``}>
            <InfoTab css={css``} title="Layers">
              🌱
            </InfoTab>
            <ButtonTab onClick={onCreateLayer} title="new layer">
              ➕
            </ButtonTab>
            <ListDocuments onLayerClick={onLayerClick} layers={layers} />
            <ButtonTab onClick={mergeVisible} title="merge visible">
              👇
            </ButtonTab>
          </div>
          <div id="bottom" css={css``}>
            <InfoTab css={css``} title="Published Doc">
              👀
            </InfoTab>
          </div>
        </div>
      </div>
    </div>
  );
}
