/** @jsxImportSource @emotion/react */
import { css } from '@emotion/react/macro'
import React, { useEffect, useCallback, useState } from 'react'
import { useLocation } from 'wouter'
import { Upwell, DraftMetadata, Draft, Author } from 'api'
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

const log = debug('DraftView')

let documents = Documents()

type DraftViewProps = {
  upwell: Upwell
  root: Draft
  author: Author
}

export default function DraftView(props: DraftViewProps) {
  let { upwell, author } = props
  let [, setLocation] = useLocation()
  let [sync_state, setSyncState] = useState<SYNC_STATE>(SYNC_STATE.SYNCED)
  let [reviewMode, setReviewMode] = useState<boolean>(false)
  let [epoch, setEpoch] = useState<number>(Date.now())
  if (!documents.upwell) throw new Error('No upwell')
  let did = getDraftHash()
  let maybeDraft

  try {
    maybeDraft = upwell.getDraft(did)
  } catch (err) {
    maybeDraft = upwell.rootDraft
  }
  let [draft, setDraft] = useState<DraftMetadata>(maybeDraft)
  let [draftInstance, setDraftInstance] = useState<Draft>(
    documents.getDraft(draft.id)
  )
  let [drafts, setDrafts] = useState<DraftMetadata[]>([])
  let [historyDraftId, setHistoryDraft] = useState<string>(upwell.rootDraft.id)

  function getDraftHash() {
    return window.location.hash.replace('#', '')
  }

  const render = useCallback(() => {
    const drafts = upwell.drafts()
    setDrafts(drafts)
    setDraftInstance(documents.getDraft(draft.id))
  }, [draft.id, upwell])

  useEffect(() => {
    documents.subscribe('upwell', (err: Error) => {
      log('got notified of a change')
      render()

      documents
        .sync(upwell.id)
        .then(() => {
          log('synced')
          render()
          setSyncState(SYNC_STATE.SYNCED)
        })
        .catch((err) => {
          log('failed to sync', err)
          setSyncState(SYNC_STATE.OFFLINE)
        })
    })

    documents.connectUpwell()
    render()

    return () => {
      documents.disconnectUpwell()
    }
  }, [upwell.id, render])

  useEffect(() => {
    let instance = documents.getDraft(draft.id)
    if (
      draft.id !== upwell.rootDraft.id &&
      draft.parent_id !== upwell.rootDraft.id &&
      !upwell.isArchived(draft.id)
    ) {
      let root = documents.getDraft(upwell.rootDraft.id)
      instance.doc.merge(root.doc)
      documents.draftChanged(instance)
    } else {
      render()
    }
    documents.connectDraft(draft.id)
    return () => {
      documents.disconnectDraft(draft.id)
    }
  }, [upwell, draft.parent_id, draft.id, render])

  let onTextChange = () => {
    if (rootId === draft.id) {
    } else {
      let draftInstance = documents.getDraft(draft.id)
      if (
        !draftInstance?.contributors.find((a) => a.id === documents.author.id)
      ) {
        draftInstance.addContributor(documents.author)
        render()
      }
      documents.draftChanged(draftInstance)
      setSyncState(SYNC_STATE.LOADING)
    }
  }

  let onCommentChange = () => {
    console.log('comment change!')
  }

  const handleTitleInputBlur = (
    e: React.FocusEvent<HTMLInputElement, Element>
  ) => {
    let draftInstance = documents.getDraft(draft.id)
    draftInstance.title = e.target.value
    documents.draftChanged(draftInstance)
  }

  const handleFileNameInputBlur = (
    e: React.FocusEvent<HTMLInputElement, Element>
  ) => {
    let meta = upwell.getDraft(draft.id)
    meta.message = e.target.value
    documents.upwellChanged()
  }

  const handleShareClick = (draft: DraftMetadata) => {
    if (
      // eslint-disable-next-line no-restricted-globals
      confirm("Do you want to share your draft? it can't be unshared.")
    ) {
      upwell.share(draft.id)
      documents.upwellChanged()
    }
  }

  let handleUpdateClick = () => {
    let draftInstance = documents.getDraft(draft.id)
    let root = documents.getDraft(upwell.rootDraft.id)
    draftInstance.doc.merge(root.doc)
    documents.draftChanged(draftInstance)
    setReviewMode(false)
    setEpoch(Date.now())
  }

  let handleMergeClick = () => {
    let draft = upwell.getDraft(did)
    upwell.rootDraft = draft
    setEpoch(Date.now())
    documents.upwellChanged()
  }

  async function createDraft() {
    let newDraft = await documents.createDraft()
    goToDraft(newDraft.id)
    documents.upwellChanged()
  }

  function goToDraft(did: string) {
    let draft = upwell.getDraft(did)
    setDraft(draft)
    setLocation(`/document/${upwell.id}#${draft.id}`)
  }

  let rootId = upwell.rootDraft.id
  const isLatest = rootId === draft.id
  return (
    <div
      id="draft-view"
      css={css`
        height: 100vh;
        display: flex;
        flex-direction: row;
        background: url('/wood.png');
      `}
    >
      <SyncIndicator state={sync_state}></SyncIndicator>
      <DraftsHistory
        did={did}
        epoch={epoch}
        goToDraft={goToDraft}
        drafts={drafts}
        setHistorySelection={(did) => setHistoryDraft(did)}
      />
      <div
        id="folio"
        css={css`
          height: 100%;
          width: 100%;
          display: flex;
          flex-direction: column;
          padding: 30px;
        `}
      >
        <div
          id="top-bar"
          css={css`
            display: flex;
            flex-direction: column;
            padding-bottom: 20px;
            margin: 10px 0;
            row-gap: 10px;
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
                value={draftInstance.title}
                placeholder={'Untitled Document'}
                onClick={(e) => {
                  e.stopPropagation()
                }}
                onChange={(e) => {
                  e.stopPropagation()
                  draftInstance.title = e.target.value
                  documents.draftChanged(draftInstance)
                }}
                onBlur={(e) => {
                  handleTitleInputBlur(e)
                }}
                css={css`
                  font-size: 1.1em;
                  font-weight: 600;
                `}
              />
              <select
                onChange={(e) => goToDraft(e.target.selectedOptions[0].value)}
              >
                <option
                  label="main"
                  value={upwell.rootDraft.id}
                  selected={upwell.rootDraft.id === draft.id}
                />
                {drafts.map((d) => (
                  <option
                    label={d.message}
                    value={d.id}
                    selected={d.id === draft.id}
                  />
                ))}
              </select>
              {isLatest || upwell.isArchived(did) ? (
                <Button onClick={createDraft}>Create Draft</Button>
              ) : (
                <>
                  <Button
                    disabled={rootId !== draft.parent_id}
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
              <Input
                value={draft.message}
                onClick={(e) => {
                  e.stopPropagation()
                }}
                onChange={(e) => {
                  e.stopPropagation()
                  draft.message = e.target.value
                  documents.upwellChanged()
                }}
                onBlur={(e) => {
                  //@ts-ignore
                  handleFileNameInputBlur(e)
                }}
              />
            </div>
            <Contributors
              contributors={draftInstance.contributors}
            ></Contributors>
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
            {draft.id !== rootId && rootId !== draft.parent_id ? (
              <Button onClick={handleUpdateClick}>Pending changes</Button>
            ) : (
              <div></div>
            )}
            <div>
              <span
                css={css`
                  gap: 20px;
                  display: flex;
                `}
              ></span>
              <span>
                view changes{' '}
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
          author={author}
          reviewMode={reviewMode}
          historyDraftId={historyDraftId}
          onChange={onTextChange}
        />
      </div>
      <div
        id="comments"
        css={css`
          width: 20vw;
          background: rgba(0, 0, 0, 0.2);
          color: white;
          padding: 10px;
        `}
      >
        <CommentSidebar
          draft={draftInstance}
          onChange={onCommentChange}
          upwell={upwell}
        />
      </div>
    </div>
  )
}
