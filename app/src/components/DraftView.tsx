/** @jsxImportSource @emotion/react */
import { css } from '@emotion/react/macro'
import React, { useEffect, useCallback, useState } from 'react'
import FormControl from '@mui/material/FormControl'
import { SelectOption } from '@mui/base/SelectUnstyled'
//@ts-ignore
import relativeDate from 'relative-date'

import { DraftMetadata, Draft, Author } from 'api'
import Documents from '../Documents'
import { EditReviewView } from './EditReview'
import { SYNC_STATE } from '../types'
import { SyncIndicator } from './SyncIndicator'
import { Button } from './Button'
import Input from './Input'
import DraftsHistory from './DraftsHistory'
import CommentSidebar from './CommentSidebar'
import Contributors from './Contributors'
import debug from 'debug'
import { debounce } from 'lodash'
import Select, { Option } from './Select'

const log = debug('DraftView')

let documents = Documents()

type DraftOption = {
  did: string
  authorId: string
  message: string
}

type DraftViewProps = {
  did: string
  id: string
  root: Draft
  author: Author
}

export default function DraftView(props: DraftViewProps) {
  let { id, author, did } = props
  let [sync_state, setSyncState] = useState<SYNC_STATE>(SYNC_STATE.SYNCED)
  let [reviewMode, setReviewMode] = useState<boolean>(false)
  let [epoch, setEpoch] = useState<number>(Date.now())
  let upwell = documents.get(id)
  const authors = upwell.metadata.getAuthors()
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
  const sync = useCallback(async () => {
    setSyncState(SYNC_STATE.LOADING)
    let upwell = documents.get(id)
    try {
      await documents.sync(id)
      log('synced')
      setSyncState(SYNC_STATE.SYNCED)
    } catch (err) {
      log('failed to sync', err)
      setSyncState(SYNC_STATE.OFFLINE)
    } finally {
      setDrafts(upwell.drafts())
      setDraft(upwell.get(did).materialize())
      log('rendering')
    }
  }, [id, did])

  const debouncedSync = React.useMemo(
    () =>
      debounce(() => {
        sync()
      }, 500),
    [sync]
  )

  useEffect(() => {
    sync()
  }, [id, sync])

  // every time the upwell id changes
  useEffect(() => {
    documents.subscribe(id, (local: boolean) => {
      let upwell = documents.get(id)
      if (!local && did === upwell.rootDraft.id && did !== 'stack') {
        return (window.location.href = 'stack')
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
      if (!local) {
        debouncedSync()
      }
    })
    return () => {
      documents.unsubscribe(id)
    }
  }, [id, draft.parent_id, draft.id, did, debouncedSync])

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

  let debouncedOnTextChange = React.useMemo(
    () =>
      debounce(() => {
        let upwell = documents.get(id)
        if (upwell.rootDraft.id === did) {
        } else {
          if (draft.contributors.indexOf(documents.author.id) === -1) {
            let draftInstance = upwell.get(did)
            draftInstance.addContributor(documents.author.id)
            setDraft(draftInstance.materialize())
          }
          console.log('syncing from onTextChange')
          documents.save(id)
        }
      }, 3000),
    [draft.contributors, id, did]
  )

  let onTextChange = () => {
    setSyncState(SYNC_STATE.LOADING)
    documents.rtcDraft?.updatePeers()
    debouncedOnTextChange()
  }

  const handleTitleInputBlur = (
    e: React.FocusEvent<HTMLInputElement, Element>
  ) => {
    let draftInstance = upwell.get(did)
    draftInstance.title = e.target.value
    documents.save(id)
  }

  const handleFileNameInputBlur = (
    e: React.FocusEvent<HTMLInputElement, Element>
  ) => {
    let draftInstance = upwell.get(did)
    draftInstance.message = e.target.value
    documents.save(id)
  }

  const handleShareClick = (draft: DraftMetadata) => {
    if (
      // eslint-disable-next-line no-restricted-globals
      confirm("Do you want to share your draft? it can't be unshared.")
    ) {
      let upwell = documents.get(id)
      upwell.share(draft.id)
      documents.save(id)
    }
  }

  let handleUpdateClick = () => {
    window.location.reload()
  }

  let handleMergeClick = () => {
    let upwell = documents.get(id)
    upwell.rootDraft = upwell.get(draft.id)
    goToDraft('stack')
  }

  function createDraft() {
    let upwell = documents.get(id)
    let newDraft = upwell.createDraft()

    documents.save(id)
    goToDraft(newDraft.id)
  }

  function goToDraft(did: string) {
    documents
      .sync(id)
      .then(() => {
        window.location.href = `/${id}/${did}`
      })
      .catch((err) => {
        window.location.href = `/${id}/${did}`
      })
  }

  const isLatest = did === 'stack'
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
      <SyncIndicator state={sync_state}></SyncIndicator>
      <DraftsHistory
        did={did}
        epoch={epoch}
        goToDraft={goToDraft}
        drafts={drafts.map((d) => d.materialize())}
        setHistorySelection={(draftId) => {
          let draft = upwell.metadata.getDraft(draftId)
          setHistoryHeads(draft.heads)
          setEpoch(Date.now())
        }}
        id={id}
      />
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
            padding: 30px 0;
          `}
        >
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
                align-items: baseline;
                column-gap: 12px;
              `}
            >
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
              <FormControl>
                <Select
                  value={{
                    did: draft.id,
                    authorId: draft.authorId,
                    message: draft.message,
                  }}
                  onChange={(value: DraftOption | null) => {
                    if (value === null) {
                      console.log('draft is null')
                      return
                    }
                    goToDraft(value.did)
                  }}
                  renderValue={renderValue}
                >
                  <Option
                    key={upwell.rootDraft.id}
                    value={{
                      did: upwell.rootDraft.id,
                      authorId: upwell.rootDraft.authorId,
                      message: upwell.rootDraft.message,
                    }}
                  >
                    stack
                  </Option>
                  {drafts.map((d) => (
                    <Option
                      key={d.id}
                      value={{
                        did: d.id,
                        authorId: d.authorId,
                        message: d.message,
                      }}
                    >
                      {d.message}
                      <div>
                        {authors[d.authorId].name} created{' '}
                        {relativeDate(new Date(draft.time))}
                      </div>
                    </Option>
                  ))}
                </Select>
              </FormControl>
              {isLatest || upwell.isArchived(draft.id) ? (
                <Button onClick={createDraft}>Create Draft</Button>
              ) : (
                <>
                  <Button
                    disabled={hasPendingChanges}
                    onClick={handleMergeClick}
                  >
                    Merge
                  </Button>
                  {draft.shared ? (
                    '(Public Draft)'
                  ) : (
                    <Button
                      onClick={(e) => {
                        e.preventDefault()
                        handleShareClick(draft)
                      }}
                    >
                      Share
                    </Button>
                  )}
                </>
              )}
              {!isLatest && (
                <Input
                  value={draft.message}
                  onClick={(e) => {
                    e.stopPropagation()
                  }}
                  onChange={(e) => {
                    e.stopPropagation()
                    setDraft({ ...draft, message: e.target.value })
                  }}
                  onBlur={(e) => {
                    //@ts-ignore
                    handleFileNameInputBlur(e)
                  }}
                />
              )}
            </div>
          </div>
          <div
            css={css`
              display: flex;
              align-items: baseline;
              column-gap: 30px;
              justify-content: space-between;
              align-items: center;
            `}
          >
            {hasPendingChanges ? (
              <Button onClick={handleUpdateClick}>Pending changes</Button>
            ) : (
              <div></div>
            )}
            <div
              css={css`
                gap: 20px;
                display: flex;
                flex-direction: row;
                align-items: baseline;
              `}
            >
              <Contributors upwell={upwell} contributors={draft.contributors} />
              <span>
                show changes{' '}
                <Button
                  css={css`
                    margin-bottom: 1ex;
                  `}
                  onClick={() => setReviewMode(!reviewMode)}
                >
                  {reviewMode ? 'on' : 'off'}
                </Button>
              </span>
            </div>
          </div>
        </div>

        <EditReviewView
          did={draft.id}
          epoch={epoch}
          visible={[draft.id]}
          id={id}
          author={author}
          reviewMode={reviewMode}
          heads={heads}
          onChange={onTextChange}
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

function renderValue(option: SelectOption<DraftOption> | null) {
  if (option == null) {
    return <span>Select a draft...</span>
  }
  return <span>{option.value.message}</span>
}
