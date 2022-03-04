/** @jsxImportSource @emotion/react */
import { css } from '@emotion/react/macro'
import React, { useCallback, useEffect } from 'react'
import { Upwell, Author, Layer } from 'api'
import ListDocuments, { ButtonTab, AuthorColorsType } from './ListDocuments'
import Documents from '../Documents'
import { EditReviewView } from './EditReview'
//@ts-ignore
import debounce from 'lodash.debounce'
import { SYNC_STATE } from '../types'
import { SyncIndicator } from './SyncIndicator'
import Input from './Input'
import deterministicColor from '../color'

let documents = Documents()

type DocumentViewProps = {
  id: string
  author: Author
}

const AUTOSAVE_INTERVAL = 3000

export default function MaybeDocument(props: DocumentViewProps) {
  let [rootId, setRootId] = React.useState<string>()
  let [authorColors, setAuthorColors] = React.useState<AuthorColorsType>({})

  const render = useCallback(
    (upwell: Upwell) => {
      console.log('rendering', upwell.id)
      let root = upwell.rootLayer()
      setRootId(root.id)

      // find the authors
      const layers = upwell.layers()
      const newAuthorColors = { ...authorColors }
      let changed = false
      layers.forEach((l) => {
        if (!(l.author in authorColors)) {
          newAuthorColors[l.author] = deterministicColor(l.author)
          changed = true
        }
      })
      // also add this user in case they haven't made a layer
      if (!(props.author in authorColors)) {
        newAuthorColors[props.author] = deterministicColor(props.author)
        changed = true
      }
      if (changed) {
        setAuthorColors((prevState) => {
          return { ...prevState, ...newAuthorColors }
        })
      }
    },
    [setRootId, authorColors, setAuthorColors, props.author]
  )

  useEffect(() => {
    async function get() {
      let upwell
      try {
        upwell = await documents.open(props.id)
      } catch (err) {
        upwell = null
      }

      try {
        if (!upwell) upwell = await documents.sync(props.id)
        render(upwell)
      } catch (err) {
        let upwell = await documents.create(props.id)
        render(upwell)
      }
    }

    get()
  }, [render, props.id])

  if (!rootId) return <div>Loading..</div>
  return (
    <DocumentView
      id={props.id}
      rootId={rootId}
      author={props.author}
      authorColors={authorColors}
    />
  )
}

export function DocumentView(props: {
  id: string
  rootId: string
  author: Author
  authorColors: AuthorColorsType
}) {
  const { id, author, authorColors } = props
  let [visible, setVisible] = React.useState<string[]>([])
  let [sync_state, setSyncState] = React.useState<SYNC_STATE>(SYNC_STATE.SYNCED)

  function onChangeMade() {
    documents.save(props.id)
    documents
      .sync(props.id)
      .then((upwell) => {
        setSyncState(SYNC_STATE.SYNCED)
      })
      .catch((err) => {
        setSyncState(SYNC_STATE.OFFLINE)
        console.error('failed to sync', err)
      })
  }

  let onLayerClick = (layer: Layer) => {
    let exists = visible.findIndex((id) => id === layer.id)
    if (exists > -1) {
      setVisible(visible.filter((id) => id !== layer.id))
    } else {
      setVisible(visible.concat([layer.id]))
    }
  }

  const handleFileNameInputBlur = (
    e: React.FocusEvent<HTMLInputElement, Element>,
    l: Layer
  ) => {
    let upwell = documents.get(id)
    l.message = e.target.value
    upwell.set(l.id, l)
    onChangeMade()
  }

  let onTextChange = () => {
    setSyncState(SYNC_STATE.LOADING)
    debouncedOnTextChange()
  }

  let debouncedOnTextChange = debounce((layer: Layer) => {
    // this is saving every time text changes, do we want this??????
    onChangeMade()
  }, AUTOSAVE_INTERVAL)

  let onCreateLayer = async () => {
    let message = ''
    // always forking from root layer (for now)
    let upwell = documents.get(id)
    let root = upwell.rootLayer()
    let newLayer = root.fork(message, author)
    upwell.add(newLayer)
    onChangeMade()
  }

  let handleShareClick = (l: Layer) => {
    let upwell = documents.get(id)
    upwell.share(l.id)
    onChangeMade()
  }

  const handleDeleteClick = (l: Layer) => {
    let upwell = documents.get(id)
    upwell.archive(l.id)

    // also remove from visible list
    const newVisible = visible.filter((id: string) => l.id !== id)
    setVisible(newVisible)

    onChangeMade()
  }

  let getEditableLayer = () => {
    if (visible.length === 1) return visible[0]
    else return undefined
  }

  return (
    <div
      id="folio"
      css={css`
        height: 100vh;
        display: flex;
        flex-direction: row;
        padding: 30px;
        background: url('/wood.png');
      `}
    >
      <SyncIndicator state={sync_state}></SyncIndicator>
      <div
        id="writing-zone"
        css={css`
          flex: 1 0 auto;
          max-width: 900px;
          margin-left: auto;
          margin-right: auto;
          padding: 20px 40px 40px;
          border-radius: 10px;
          display: flex;
          flex-direction: row;
          position: relative;
        `}
      >
        <EditReviewView
          id={id}
          onChange={onTextChange}
          visible={visible}
          author={author}
          colors={authorColors}
        ></EditReviewView>
        <div
          id="right-side"
          css={css`
            display: flex;
            flex-direction: column;
            align-items: flex-start;
            margin-left: -1px;
          `}
        >
          <ButtonTab onClick={onCreateLayer} title="new layer">
            ➕
          </ButtonTab>
          <ListDocuments
            id={id}
            isBottom
            colors={authorColors}
            onLayerClick={onLayerClick}
            visible={visible}
            handleShareClick={handleShareClick}
            handleDeleteClick={handleDeleteClick}
            onInputBlur={handleFileNameInputBlur}
            editableLayer={getEditableLayer()}
          />
        </div>
        <div
          id="bottom-bar"
          css={css`
            position: absolute;
            bottom: -14px;
            left: 0;
            width: 100%;
            display: flex;
            flex-direction: row;
            justify-content: space-between;
            padding: 4px 38px;
          `}
        >
          <div
            css={css`
              color: white;
            `}
          >
            Your name is{` `}
            <Input
              readOnly
              css={css`
                font-size: 16px;
                cursor: not-allowed;
                color: white;
                box-shadow: 0px -9px 0px 0px ${authorColors[
                    author
                  ]?.toString() || 'none'} inset;
              `}
              value={author}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

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
  */
