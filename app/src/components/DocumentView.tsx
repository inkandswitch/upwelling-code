/** @jsxImportSource @emotion/react */
import { css } from "@emotion/react/macro";
import React, { useEffect } from "react";
import { SyncIndicator } from "./SyncIndicator";
import { SYNC_STATE } from "../types";
import { Author, Layer, Upwell } from "api";
import Documents from "../Documents";
import ListDocuments, { ButtonTab, InfoTab } from "./ListDocuments";

let upwell: Upwell = Documents();

type DocumentProps = {
  id: string;
  author: Author;
};

type DocumentViewProps = {
  layer: Layer;
  author: Author;
};

type LayerState = {
  text: string;
  title: string;
};

async function open(): Promise<Uint8Array> {
  let [fileHandle] = await showOpenFilePicker();
  const file = await fileHandle.getFile();
  return new Uint8Array(await file.arrayBuffer());
}

function DocumentView(props: DocumentViewProps) {
  const { author, layer } = props;
  let [status, setStatus] = React.useState(SYNC_STATE.LOADING);
  let [state, setState] = React.useState<LayerState>({
    text: layer.text,
    title: layer.title,
  });
  let [layers, setLayers] = React.useState<Layer[]>([]);
  useEffect(() => {
    upwell.layers().then((layers: Layer[]) => {
      setLayers(layers);
    });
  }, []);

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

  let onCreateLayer = async () => {
    let message = "Very cool layer";
    let newLayer = Layer.create(message, author, layer);
    await upwell.persist(newLayer);
    setLayers(await upwell.layers());
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

  let mergeVisible = () => {
    let visible = layers.filter((l) => l.visible);
  };

  function onTextChange(
    e: React.ChangeEvent<HTMLTextAreaElement>,
    key: string
  ) {
    e.preventDefault();
    setStatus(SYNC_STATE.LOADING);
    // @ts-ignore
    switch (e.nativeEvent.inputType) {
      case "insertText":
        //@ts-ignore
        layer.insertAt(e.target.selectionEnd - 1, e.nativeEvent.data, key);
        break;
      case "deleteContentBackward":
        layer.deleteAt(e.target.selectionEnd, key);
        break;
      case "insertLineBreak":
        layer.insertAt(e.target.selectionEnd - 1, "\n", key);
        break;
    }
    setState({ title: layer.title, text: layer.text });
    upwell.persist(layer);
    setStatus(SYNC_STATE.SYNCED);
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
          <SyncIndicator state={status} />
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
            <ListDocuments layers={layers} />
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

export default function MaybeDocumentView({ author, id }: DocumentProps) {
  let [layer, setState] = React.useState<Layer | null>(null);

  useEffect(() => {
    // FIXME: what if the id isn't a real one (and just junk?)
    // Make sure to handle errors gracefully (either redirect to list or just make a new document)
    upwell
      .getLocal(id)
      .then((layer: Layer | null) => {
        console.log(layer);
        if (layer) setState(layer);
      })
      .catch((err: Error) => {
        console.error("got error", err);
      });
  }, [id]);

  if (layer) return <DocumentView author={author} layer={layer} />;
  else return <div>Loading...</div>;
}
