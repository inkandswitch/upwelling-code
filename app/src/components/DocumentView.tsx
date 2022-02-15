/** @jsxImportSource @emotion/react */
import React, { useEffect } from "react";
import { css, Interpolation, Theme } from "@emotion/react/macro";
import { SyncIndicator } from "./SyncIndicator";
import { SYNC_STATE } from "../types";
import { Author, Layer, Upwell } from "api";
import Documents from "../Documents";
import ListDocuments from "./ListDocuments";
import { JSX } from "@emotion/react/jsx-runtime";

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

  const Folio = (
    props: JSX.IntrinsicAttributes & {
      css?: Interpolation<Theme>;
    } & React.ClassAttributes<HTMLDivElement> &
      React.HTMLAttributes<HTMLDivElement> & { css?: Interpolation<Theme> }
  ) => (
    <div
      css={css`
        display: flex;
        flex-direction: row;
        border-radius: 4px;
      `}
      {...props}
    />
  );

  const WritingZone = () => (
    <textarea
      css={css`
        background: white;
        padding: 20px;
        border-color: lightgray;
        flex: 1 1 auto;
      `}
      className="text"
      value={state.text}
      onChange={(e) => onTextChange(e, "text")}
    ></textarea>
  );

  function Button(
    props: JSX.IntrinsicAttributes & {
      css?: Interpolation<Theme>;
    } & React.ClassAttributes<HTMLButtonElement> &
      React.ButtonHTMLAttributes<HTMLButtonElement> & {
        css?: Interpolation<Theme>;
      }
  ) {
    return (
      <button
        css={css`
          padding: 8px 16px;
          border-radius: 3px;
          font-size: 16px;
          border: none;
          font-weight: 500;
          cursor: pointer;
          display: inline-flex;
          flex-direction: row;
          align-items: center;
          justify-content: center;
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
    <div id="container">
      <div id="app">
        <div id="toolbar">
          <div id="toolbar.buttons">
            <button onClick={onOpenClick}>Open</button>
            <button onClick={onDownloadClick}>Download</button>
            <button onClick={onSyncClick}>Sync</button>
          </div>
          <div>
            <SyncIndicator state={status} />
          </div>
        </div>
        <Folio>
          {/* <textarea
            className="title"
            value={state.title}
            onChange={(e) => onTextChange(e, "title")}
          ></textarea> */}
          <WritingZone />
          <div
            css={css`
              flex: 0 1 auto;
            `}
          >
            <Button onClick={onCreateLayer}>+ Layer</Button>
            <ListDocuments layers={layers} />
          </div>
        </Folio>
        <div id="debug">
          id: {layer.id}
          <br></br>
          author: {layer.author}
          <br></br>
          message: {layer.message}
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
