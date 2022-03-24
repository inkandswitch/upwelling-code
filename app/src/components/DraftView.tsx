/** @jsxImportSource @emotion/react */
import { css } from '@emotion/react/macro'
import React, { useEffect, useCallback, useState } from 'react'
import { useLocation } from 'wouter'
//@ts-ignore
import { DraftMetadata, Draft, Author } from 'api'
import { AuthorColorsType } from './ListDocuments'
import Documents from '../Documents'
import { EditReviewView } from './EditReview'
import { SYNC_STATE } from '../types'
import { SyncIndicator } from './SyncIndicator'
import deterministicColor from '../color'
import { Button } from './Button'
import Input from './Input'
import DraftsHistory from './DraftsHistory'
import CommentSidebar from './CommentSidebar'
import Contributors from './Contributors'

let documents = Documents()

type DraftViewProps = {
  id: string
  root: Draft
  author: Author
}

const AUTOSAVE_INTERVAL = 5000

export default function DraftView(props: DraftViewProps) {
  let { id, author } = props
  let [, setLocation] = useLocation()
  let [authorColors, setAuthorColors] = useState<AuthorColorsType>({})
  let [sync_state, setSyncState] = useState<SYNC_STATE>(SYNC_STATE.SYNCED)
  let [reviewMode, setReviewMode] = useState<boolean>(false)
  let [epoch, setEpoch] = useState<number>(Date.now())
  let upwell = documents.get(id)
  let did = getDraftHash()
  let maybeDraft
  try {
    maybeDraft = upwell.get(did)
  } catch (err) {
    maybeDraft = upwell.rootDraft
  }
  let [draft, setDraft] = useState<DraftMetadata>(maybeDraft.materialize())
  let [drafts, setDrafts] = useState<Draft[]>([])

  function getDraftHash() {
    return window.location.hash.replace('#', '')
  }

  useEffect(() => {
    documents.connect(id, draft.id)

    return () => {
      documents.disconnect()
    }
  }, [id, draft.id])

  const render = useCallback(() => {
    let upwell = documents.get(id)
    const drafts = upwell.drafts()
    setDrafts(drafts)

    // find the authors
    const newAuthorColors = { ...authorColors }
    let changed = false
    drafts.forEach((l) => {
      if (!(l.authorId in authorColors)) {
        newAuthorColors[l.authorId] = deterministicColor(l.authorId)
        changed = true
      }
    })
    // also add this user in case they haven't made a draft
    if (!(props.author.id in authorColors)) {
      newAuthorColors[props.author.id] = deterministicColor(props.author.id)
      changed = true
    }
    if (changed) {
      setAuthorColors((prevState: any) => {
        return { ...prevState, ...newAuthorColors }
      })
    }
  }, [id, authorColors, setAuthorColors, props.author])

  useEffect(() => {
    let interval = setInterval(() => {
      documents.sync(id).then(() => {
        setSyncState(SYNC_STATE.SYNCED)
      })
    }, AUTOSAVE_INTERVAL)
    return () => {
      clearInterval(interval)
    }
  }, [id, render])

  const handleFileNameInputBlur = (
    e: React.FocusEvent<HTMLInputElement, Element>
  ) => {
    let draftInstance = upwell.get(draft.id)
    draftInstance.message = e.target.value
    onChangeMade()
  }

  const onChangeMade = useCallback(() => {
    documents
      .upwellChanged(props.id)
      .then(() => {
        setSyncState(SYNC_STATE.SYNCED)
      })
      .catch((err) => {
        setSyncState(SYNC_STATE.OFFLINE)
        console.error('failed to sync', err)
      })
  }, [props.id])

  useEffect(() => {
    let upwell = documents.get(id)
    let draftInstance = upwell.get(draft.id)
    if (
      !draftInstance.pinned &&
      draftInstance.id !== upwell.rootDraft.id &&
      draftInstance.parent_id !== upwell.rootDraft.id &&
      !upwell.isArchived(draftInstance.id)
    ) {
      upwell.updateToRoot(draftInstance)
      onChangeMade()
    }
  }, [id, draft, onChangeMade])

  useEffect(() => {
    let upwell = documents.get(id)
    upwell.subscribe(() => {
      render()
    })
    render()
    return () => {
      upwell.unsubscribe()
    }
  }, [id, render])

  let onTextChange = () => {
    if (rootId === draft.id) {
    } else {
      if (draft.contributors.indexOf(documents.author.id) === -1) {
        let upwell = documents.get(id)
        let draftInstance = upwell.get(draft.id)
        draftInstance.addContributor(documents.author.id)
        setDraft(draftInstance.materialize())
      }
      documents.updatePeers(id, did)
      setSyncState(SYNC_STATE.LOADING)
    }
  }

  let onCommentChange = () => {
    console.log('comment change!')
  }

  const handleShareClick = (draft: DraftMetadata) => {
    if (
      // eslint-disable-next-line no-restricted-globals
      confirm("Do you want to share your draft? it can't be unshared.")
    ) {
      let upwell = documents.get(id)
      upwell.share(draft.id)
    }
  }

  let handleUpdateClick = () => {
    let root = upwell.rootDraft
    let message = draft.message
    let draftInstance = upwell.get(draft.id)
    draftInstance.merge(root)
    draftInstance.message = message
    draftInstance.parent_id = root.id
    setDraft(draftInstance.materialize())
    onChangeMade()
    setReviewMode(false)
    setEpoch(Date.now())
  }

  let handleMergeClick = () => {
    let upwell = documents.get(id)
    let draft = upwell.get(did)
    upwell.setLatest(draft)
    setDraft(upwell.rootDraft.materialize())
    setEpoch(Date.now())
    onChangeMade()
  }

  function createDraft() {
    let upwell = documents.get(id)
    let newDraft = upwell.createDraft()
    goToDraft(newDraft.id)
    onChangeMade()
  }

  function goToDraft(did: string) {
    let draft = upwell.get(did).materialize()
    setDraft(draft)
    render()
    setLocation(`/document/${id}#${draft.id}`)
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
        colors={authorColors}
        drafts={drafts}
        id={id}
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
              <span
                css={css`
                  font-size: 1.1em;
                  font-weight: 600;
                `}
              >
                Our document
              </span>
              <select
                onChange={(e) => goToDraft(e.target.selectedOptions[0].value)}
              >
                <option label="main" value={upwell.rootDraft.id} />
                {drafts.map((draft) => (
                  <option label={draft.message} value={draft.id} />
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
                  setDraft({ ...draft, message: e.target.value })
                }}
                onBlur={(e) => {
                  //@ts-ignore
                  handleFileNameInputBlur(e)
                }}
              />
            </div>
            <Contributors
              colors={authorColors}
              upwell={upwell}
              contributors={draft.contributors}
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
            <Button
              disabled={rootId === draft.parent_id}
              onClick={handleUpdateClick}
            >
              Pending changes
            </Button>
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
          id={id}
          author={author}
          colors={authorColors}
          reviewMode={reviewMode}
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
          draft={draft}
          onChange={onCommentChange}
          upwell={upwell}
          colors={authorColors}
        />
      </div>
    </div>
  )
}
