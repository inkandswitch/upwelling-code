/** @jsxImportSource @emotion/react */
import { css } from '@emotion/react/macro'
import React, { useEffect, useState } from 'react'
import FormControl from '@mui/material/FormControl'
import Switch from '@mui/material/Switch'
import { DraftMetadata, Draft, Author } from 'api'
import Documents from '../Documents'
import { EditReviewView } from './EditReview'
import { Button } from './Button'
import Input from './Input'
import DraftsHistory from './DraftsHistory'
import CommentSidebar from './CommentSidebar'
import Contributors from './Contributors'
import debug from 'debug'
import { debounce } from 'lodash'
import Select, { DetailedOption } from './Select'
import { ReactComponent as Pancake } from '../components/icons/Pancake.svg'
import { ReactComponent as Pancakes } from '../components/icons/Pancakes.svg'
import { getYourDrafts } from '../util'
import InputModal from './InputModal'

const log = debug('DraftView')

const blue = '#0083A3'
let documents = Documents()

type DraftViewProps = {
  did: string
  epoch: number
  id: string
  root: Draft
  author: Author
  sync: () => void
}

const pancakeCSS = `
  width: 45px;
  cursor: pointer;
  height: 45px;
  :hover path {
    fill: lightblue;
  }
`

export default function DraftView(props: DraftViewProps) {
  let { id, author, did, epoch, sync } = props
  let [reviewMode, setReviewMode] = useState<boolean>(true)

  let upwell = documents.get(id)
  const isLatest = did === 'stack'

  let maybeDraft
  try {
    maybeDraft = upwell.get(did)
  } catch (err) {
    maybeDraft = upwell.rootDraft
  }
  let [draft, setDraft] = useState<DraftMetadata>(maybeDraft.materialize())
  let [drafts, setDrafts] = useState<Draft[]>(upwell.drafts())
  let [heads, setHistoryHeads] = useState<string[]>(
    upwell.rootDraft.materialize().heads
  )
  let [hasPendingChanges, setHasPendingChanges] = useState<boolean>(
    did !== 'stack' && upwell.rootDraft.id !== draft.parent_id
  )

  useEffect(() => {
    let upwell = documents.get(id)
    setDrafts(upwell.drafts())
    setDraft(upwell.get(did).materialize())
    log('rendering')
  }, [id, did, epoch])

  // every time the upwell id changes
  useEffect(() => {
    documents.subscribe(id, (local: boolean) => {
      let upwell = documents.get(id)
      if (!local && did === upwell.rootDraft.id && did !== 'stack') {
        // someone merged my draft while i was looking at it
        documents.sync(id).then(() => {
          window.location.href = `/${id}/stack`
        })
      }
      if (!local && did === 'stack' && upwell.metadata.main !== draft.id) {
        setHasPendingChanges(true)
      } else if (did !== 'stack' && upwell.rootDraft.id !== draft.parent_id) {
        setHasPendingChanges(true)
      }
      if (local) {
        let instance = upwell.get(did)
        setDraft(instance.materialize())
      }
      sync()
    })
    return () => {
      documents.unsubscribe(id)
    }
  }, [id, draft.parent_id, draft.id, did, sync])

  // every time the draft id changes
  useEffect(() => {
    let emitter = documents.connectDraft(id, did)
    emitter.on('data', () => {
      log('updating draft metadata')
      let upwell = documents.get(id)
      let instance = upwell.get(did)
      setDraft(instance.materialize())
    })
    return () => {
      documents.disconnect(did)
    }
  }, [id, did])

  const handleTitleInputBlur = (
    e: React.FocusEvent<HTMLInputElement, Element>
  ) => {
    let draftInstance = upwell.get(did)
    draftInstance.title = e.target.value
    documents.save(id)
  }

  /*
  const handleShareClick = (draft: DraftMetadata) => {
    if (
      // eslint-disable-next-line no-restricted-globals
      confirm("Do you want to share your draft? it can't be unshared.")
    ) {
      let upwell = documents.get(id)
      upwell.share(draft.id)
      documents.draftChanged(id, draft.id)
    }
  }
  */

  let handleUpdateClick = () => {
    window.location.reload()
  }

  let handleMergeClick = () => {
    let upwell = documents.get(id)
    upwell.rootDraft = upwell.get(draft.id)
    let drafts = upwell.drafts()
    if (!drafts.length) {
      goToDraft('stack')
    } else {
      goToDraft(drafts[0].id)
    }
  }

  const createDraft = async (draftName: string) => {
    let upwell = documents.get(id)
    let newDraft = upwell.createDraft(draftName)
    upwell.share(newDraft.id)
    goToDraft(newDraft.id)
  }

  function goToDraft(did: string) {
    documents
      .save(id)
      .then(() => {
        window.location.href = `/${id}/${did}`
      })
      .catch((err) => {
        window.location.href = `/${id}/${did}`
      })
  }

  // Hack because the params are always undefined?
  function renderValue() {
    return draft.id === upwell.rootDraft.id ? '(not in a draft)' : draft.message
  }
  // borked?
  // function renderValue(option: SelectOption<DraftMetadata> | null) {
  //   console.log('renderValue', option)
  //   if (option === null || option === undefined) {
  //     return <span>Select a draft...</span>
  //   }
  //   return <span>{option.value.message}</span>
  // }

  const setHistorySelection = debounce((d: DraftMetadata) => {
    console.log(d.id, upwell.rootDraft.id)
    if (d.id === upwell.rootDraft.id) {
      setHistoryHeads([])
    } else {
      let draft = upwell.metadata.getDraft(d.id)
      setHistoryHeads(draft.heads)
    }
  }, 30)

  const draftsMeta = drafts.map((d) => d.materialize())

  return (
    <div
      id="draft-view"
      css={css`
        height: 100vh;
        overflow: auto;
        display: flex;
        flex-direction: row;
        background: #f9f9fa;
        justify-content: space-between;
      `}
    >
      <div id="spacer-placeholder" />
      <div
        id="folio"
        css={css`
          width: 100%;
          display: flex;
          flex-direction: column;
          padding-right: 20px;
          max-width: 1000px;
        `}
      >
        <div
          id="top-bar"
          css={css`
            display: flex;
            flex-direction: column;
            row-gap: 10px;
            padding: 10px 0px;
          `}
        >
          <div
            css={css`
              display: flex;
              align-items: baseline;
              column-gap: 30px;
              justify-content: space-between;
              align-items: center;
            `}
          >
            <div
              css={css`
                display: flex;
                align-items: baseline;
                column-gap: 30px;
                justify-content: space-between;
                align-items: center;
              `}
            >
              <Pancake
                css={css`
                  ${pancakeCSS}
                  path {
                    fill: ${did === 'stack' ? '' : blue};
                  }
                `}
              ></Pancake>
              <FormControl>
                <Select
                  value={draftsMeta.find((d) => d.id === draft.id)}
                  onChange={(value: DraftMetadata | null) => {
                    if (value === null) {
                      console.log('draft is null')
                      return
                    }
                    goToDraft(value.id)
                  }}
                  renderValue={renderValue}
                >
                  {getYourDrafts(
                    draftsMeta,
                    upwell.rootDraft.id,
                    author.id
                  ).map((d) => (
                    <DetailedOption
                      key={d.id}
                      option={d}
                      upwell={upwell}
                      icon={Pancake}
                    />
                  ))}
                </Select>
              </FormControl>
              {hasPendingChanges && (
                <Button
                  css={css`
                    background: white;
                    color: #da1e28;
                    border: 1px solid #da1e28;
                    &:hover {
                      background: #ffdede;
                    }
                  `}
                  onClick={handleUpdateClick}
                >
                  Pending changes
                </Button>
              )}

              {!isLatest && (
                <>
                  <Button
                    disabled={hasPendingChanges}
                    onClick={handleMergeClick}
                  >
                    Merge
                  </Button>
                </>
              )}
            </div>
          </div>
          <div
            css={css`
              display: flex;
              flex-direction: row;
              align-items: center;
              justify-content: space-between;
            `}
          >
            <div
              css={css`
                display: flex;
                align-items: center;
              `}
            >
              <Pancakes
                css={css`
                  ${pancakeCSS}
                  path {
                    fill: ${did === 'stack' ? blue : ''};
                  }
                `}
                onClick={() => goToDraft('stack')}
              />
              <Input
                value={draft.title}
                placeholder={'Untitled Document'}
                onClick={(e) => {
                  e.stopPropagation()
                }}
                onChange={(e) => {
                  e.stopPropagation()
                  setDraft({ ...draft, title: e.target.value })
                  let draftInstance = upwell.get(did)
                  draftInstance.title = e.target.value
                  documents.draftChanged(id, did)
                }}
                onBlur={(e) => {
                  handleTitleInputBlur(e)
                }}
                css={css`
                  font-size: 1.1em;
                  font-weight: 600;
                `}
              />
              <InputModal onCreateDraft={createDraft} />
            </div>
            <div
              css={css`
                display: flex;
                align-items: center;
              `}
            >
              <Contributors upwell={upwell} contributors={draft.contributors} />
              <span>
                <Switch
                  inputProps={{ 'aria-label': 'show changes' }}
                  checked={reviewMode}
                  onClick={() => setReviewMode(!reviewMode)}
                />
                {!reviewMode || (reviewMode && !heads.length)
                  ? 'show changes '
                  : 'showing changes from ' +
                    upwell.rootDraft._getValue('message', heads)}
              </span>
              <DraftsHistory
                did={did}
                epoch={epoch}
                goToDraft={goToDraft}
                drafts={draftsMeta}
                setHistorySelection={setHistorySelection}
                id={id}
                author={author}
              />
            </div>
          </div>
        </div>

        <EditReviewView
          did={draft.id}
          visible={[draft.id]}
          id={id}
          author={author}
          reviewMode={reviewMode}
          heads={heads}
        />
      </div>
      <div
        id="comments"
        css={css`
          flex: 0 1 auto;
          background: rgba(0, 0, 0, 0.2);
          color: white;
        `}
      >
        <CommentSidebar draft={draft} id={id} />
      </div>
    </div>
  )
}

function arrayEquals(a: Array<any>, b: Array<any>) {
  return (
    Array.isArray(a) &&
    Array.isArray(b) &&
    a.length === b.length &&
    a.every((val, index) => val === b[index])
  )
}
