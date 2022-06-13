/** @jsxImportSource @emotion/react */
import { css } from '@emotion/react/macro'
import React, { useEffect, useState } from 'react'
import FormControl from '@mui/material/FormControl'
import Switch from '@mui/material/Switch'
import { Upwell, DraftMetadata, Draft, Author, CommentState } from 'api'
import Documents from '../Documents'
import { EditReviewView } from './EditReview'
import { Button, buttonIconStyle } from './Button'
import Input from './Input'
import DraftsHistory from './DraftsHistory'
import CommentSidebar, { Comments } from './CommentSidebar'
import Contributors from './Contributors'
import debug from 'debug'
import Select, { DetailedOption } from './Select'
import { ReactComponent as Pancake } from '../components/icons/Pancake.svg'
import { ReactComponent as Pancakes } from '../components/icons/Pancakes.svg'
import { ReactComponent as OffsetPancakes } from '../components/icons/OffsetPancakes.svg'
import { ReactComponent as Merge } from '../components/icons/Merge.svg'
import { getYourDrafts } from '../util'
import InputModal from './InputModal'
import DraftMenu from './DraftMenu'
import { useLocation } from 'wouter'
import ShareButton from './ShareButton'
import ConfirmModal from './ConfirmModal'

const log = debug('DraftView')

const blue = '#0083A3'
let documents = Documents()

export enum ModalState {
  CLOSED,
  NEW_DRAFT,
  MERGE,
  HAS_COMMENTS,
  NAME_BEFORE_SHARE,
}

type DraftViewProps = {
  did: string
  id: string
  root: Draft
  author: Author
  sync: () => Promise<void>
}

const pancakeCSS = `
  cursor: pointer;
  :hover path {
    fill: lightblue;
  }
`

export default function DraftView(props: DraftViewProps) {
  let { id, author, did, sync } = props
  let [, setLocation] = useLocation()
  let [modalState, setModalState] = useState<ModalState>(ModalState.CLOSED)
  let upwell = documents.get(id)
  let [stackSelected, setStackSelected] = useState<boolean>(
    did === 'stack' || did === upwell.rootDraft.id
  )

  let maybeDraft
  try {
    if (!upwell.isArchived(did) && did !== 'stack') {
      maybeDraft = upwell.get(did)
    } else {
      maybeDraft = upwell.rootDraft
    }
  } catch (err) {
    maybeDraft = upwell.rootDraft
  }
  maybeDraft.addContributor(documents.author.id)
  let [draft, setDraft] = useState<DraftMetadata>(maybeDraft.materialize())
  let [drafts, setDrafts] = useState<Draft[]>(upwell.drafts())
  let [historyHeads, setHistoryHeads] = useState<string[] | false>(false)
  let [historyTitle, setHistoryTitle] = useState<string>('')

  useEffect(() => {
    let upwell = documents.get(id)
    setDrafts(upwell.drafts())
    setDraft(upwell.get(draft.id).materialize())
    log('rendering')
  }, [id, draft.id])

  useEffect(() => {
    let part = stackSelected ? 'stack' : draft.id
    setLocation(`/${id}/${part}`)
  }, [setLocation, stackSelected, id, draft.id])

  // every time the upwell id changes
  useEffect(() => {
    let upwell = documents.get(id)
    let instance = upwell.get(draft.id)
    upwell.updateToRoot(instance)
    documents.subscribe(id, async (local: boolean) => {
      let instance = upwell.get(draft.id)
      if (local) {
        setDraft(instance.materialize())
        console.log('got local change')
      } else {
        upwell.updateToRoot(instance)
      }
      upwell.getChangesFromRoot(instance)
      window.requestIdleCallback(() => {
        sync()
      })
    })
    return () => {
      documents.unsubscribe(id)
    }
  }, [id, draft.parent_id, draft.id, sync])

  // every time the draft id changes
  useEffect(() => {
    let emitter = documents.connectDraft(id, draft.id)
    log('connecting', draft.id)
    emitter.on('data', () => {
      log('updating draft metadata')
      let upwell = documents.get(id)
      let instance = upwell.get(draft.id)
      setDraft(instance.materialize())
    })
    return () => {
      documents.disconnect()
    }
  }, [id, draft.id])

  const handleTitleInputBlur = (
    e: React.FocusEvent<HTMLInputElement, Element>
  ) => {
    let draftInstance = upwell.get(draft.id)
    draftInstance.title = e.target.value
    documents.save(id)
  }

  const handleOnClickEditor = () => {
    if (stackSelected) {
      let draftInstance = upwell.createDraft(upwell.SPECIAL_UNNAMED_DOCUMENT)
      goToDraft(draftInstance.id)
    }
  }

  const onMerge = async (draftName?: string) => {
    let upwell = documents.get(id)
    let draftInstance = upwell.get(draft.id)
    if (draftName) draftInstance.message = draftName
    upwell.rootDraft = draftInstance
    await documents.save(id)
    documents
      .sync(id)
      .then(() => {
        documents.rtcUpwell?.updatePeers()
        goToDraft('stack')
      })
      .catch((err) => {
        console.error('failed to sync')
        console.error(err)
        throw new Error('You cant merge while offline')
      })
  }

  const handleMergeClick = async () => {
    let upwell = documents.get(id)
    let draftInstance = upwell.get(draft.id)
    const comments = draftInstance.comments.objects()

    if (hasUnresolvedComments(comments)) {
      setModalState(ModalState.HAS_COMMENTS)
    }
    // Set to MERGE if it's an unnamed draft, which brings up the "name your draft" modal
    else if (draftInstance.message === 'Untitled draft') {
      setModalState(ModalState.MERGE)
    } else {
      onMerge()
    }
  }

  const createDraft = async (draftName: string) => {
    let upwell = documents.get(id)
    let newDraft = upwell.createDraft(draftName)
    documents.rtcUpwell?.updatePeers()
    goToDraft(newDraft.id)
  }

  const handleCommentDestroy = async () => {
    let upwell = documents.get(id)
    let draftInstance = upwell.get(draft.id)
    const comments = draftInstance.comments.objects()

    Object.values(comments).forEach((c) => {
      draftInstance.comments.resolve(c)
      c.children.forEach((ch) => draftInstance.comments.resolve(comments[ch]))
    })

    documents.draftChanged(upwell.id, draft.id)
    setModalState(ModalState.MERGE)
    handleMergeClick()
  }

  const handleModalClose = () => setModalState(ModalState.CLOSED)

  const handleEditName = (draftName: string) => {
    const upwell = documents.get(id)
    let draftInstance = upwell.get(draft.id)
    draftInstance.message = draftName
    documents.save(id)
  }

  const handleDeleteDraft = () => {
    const upwell = documents.get(id)
    upwell.archive(draft.id)
    documents.rtcUpwell?.updatePeers()
    goToDraft('stack')
  }

  const handleShareSelect = () => {
    const upwell = documents.get(id)
    let draftInstance = upwell.get(draft.id)

    if (
      !draftInstance.message ||
      draftInstance.message.startsWith(Upwell.SPECIAL_UNNAMED_SLUG)
    ) {
      setModalState(ModalState.NAME_BEFORE_SHARE)
      return
    }

    shareDraft(draftInstance)
  }

  const handleFinishSharing = (draftName: string) => {
    handleEditName(draftName)

    const upwell = documents.get(id)
    let draftInstance = upwell.get(draft.id)
    shareDraft(draftInstance)
  }

  const shareDraft = (draftInstance: Draft) => {
    draftInstance.shared = true
    documents.draftChanged(upwell.id, draft.id)
  }

  function goToDraft(did: string) {
    documents
      .save(id)
      .catch((err) => {
        console.error('failure to save', err)
      })
      .finally(() => {
        const url = `/${id}/${did}`
        if (did === 'stack') {
          window.location.href = url
        } else {
          setLocation(url)
        }
      })
  }

  function getChanges(draftMeta: DraftMetadata) {
    let draftInstance = upwell.get(draftMeta.id)
    if (draftMeta.id === upwell.rootDraft.id) return 0
    return upwell.getChangesFromRoot(draftInstance)
  }

  function isInADraft(draftMeta: DraftMetadata) {
    return draftMeta.id !== upwell.rootDraft.id
  }

  function handleCopyLink() {
    let url = document.location.href

    navigator.clipboard.writeText(url).then(
      function () {
        console.log('Copied!')
      },
      function () {
        console.log('Copy error')
      }
    )
  }

  // Hack because the params are always undefined?
  function renderDraftMessage(draftMeta: DraftMetadata) {
    if (!isInADraft(draftMeta)) return '(not in a draft)'
    let draftInstance = upwell.get(draftMeta.id)
    return draftInstance.message
  }

  const setHistorySelection = (d: DraftMetadata) => {
    let draft = upwell.metadata.getDraft(d.id)
    if (draft.id === upwell.rootDraft.id) {
      setHistoryHeads([])
    } else {
      setHistoryHeads(draft.initialHeads)
    }
    setHistoryTitle(d.message)
  }

  const draftsMeta = drafts.map((d) => d.materialize())
  const showChangesSince = historyHeads && historyHeads.length > 0

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
      <InputModal
        open={modalState === ModalState.MERGE}
        onSubmit={onMerge}
        onClose={handleModalClose}
      />
      <InputModal
        open={modalState === ModalState.NEW_DRAFT}
        onSubmit={createDraft}
        onClose={handleModalClose}
      />
      <InputModal
        open={modalState === ModalState.NAME_BEFORE_SHARE}
        onSubmit={handleFinishSharing}
        onClose={handleModalClose}
        title="Before sharing, name this layer:"
      />
      <ConfirmModal
        title="Delete comments and merge?"
        message="This draft has unresolved comments. If you merge, they won't be brought along."
        open={modalState === ModalState.HAS_COMMENTS}
        onSubmit={handleCommentDestroy}
        onClose={handleModalClose}
      />
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
                column-gap: 10px;
                justify-content: space-between;
                align-items: center;
              `}
            >
              <Pancake
                css={css`
                  path {
                    fill: ${stackSelected ? '' : blue};
                  }
                `}
              ></Pancake>
              <FormControl>
                <Select
                  onChange={(value: DraftMetadata | null) => {
                    if (value === null) return
                    const url = `/${id}/${value.id}`
                    setLocation(url)
                  }}
                  renderValue={() => renderDraftMessage(draft)}
                >
                  {getYourDrafts(
                    draftsMeta,
                    upwell.rootDraft.id,
                    author.id
                  ).map((d) => {
                    return (
                      <DetailedOption
                        key={d.id}
                        option={{
                          ...d,
                          message: renderDraftMessage(d),
                        }}
                        changes={getChanges(d)}
                        upwell={upwell}
                        icon={Pancake}
                      />
                    )
                  })}
                </Select>
              </FormControl>
              {isInADraft(draft) && (
                <>
                  <ShareButton
                    isShared={draft.shared}
                    onShareSelect={handleShareSelect}
                  />
                  <Button
                    css={buttonIconStyle}
                    variant="outlined"
                    aria-label="merge"
                    disabled={stackSelected}
                    onClick={handleMergeClick}
                  >
                    <Merge />
                  </Button>
                  <DraftMenu
                    onShare={handleCopyLink}
                    onEditName={handleEditName}
                    onDelete={handleDeleteDraft}
                  />
                </>
              )}
            </div>
            <div
              css={css`
                display: flex;
                align-items: center;
                position: relative;
              `}
            >
              <Contributors upwell={upwell} contributors={draft.contributors} />
              <div
                id="changes-and-history"
                css={css`
                  display: flex;
                  flex-direction: row;
                  align-items: center;
                `}
              >
                <Switch
                  inputProps={{ 'aria-label': 'show changes' }}
                  checked={historyHeads !== false}
                  onClick={() => {
                    if (historyHeads) setHistoryHeads(false)
                    else setHistoryHeads([])
                  }}
                />
                {showChangesSince ? 'Changes since' : 'Show changes '}
                <DraftsHistory
                  did={draft.id}
                  goToDraft={goToDraft}
                  drafts={draftsMeta}
                  setHistorySelection={setHistorySelection}
                  id={id}
                  author={author}
                />
              </div>
              {showChangesSince ? (
                <div
                  css={css`
                    position: absolute;
                    right: 30px;
                    top: 38px;
                    display: flex;
                    align-items: center;
                    column-gap: 4px;
                  `}
                >
                  <OffsetPancakes />
                  {historyTitle}
                </div>
              ) : null}
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
                onClick={() => setStackSelected(true)}
                css={css`
                  ${pancakeCSS}
                  path {
                    fill: ${stackSelected ? blue : ''};
                  }
                `}
              />
              <Input
                value={stackSelected ? upwell.rootDraft.title : draft.title}
                placeholder={'Untitled Document'}
                onClick={(e) => {
                  e.stopPropagation()
                }}
                onChange={(e) => {
                  e.stopPropagation()
                  setDraft({ ...draft, title: e.target.value })
                  let draftInstance = upwell.get(draft.id)
                  draftInstance.title = e.target.value
                  documents.draftChanged(id, draft.id)
                }}
                onBlur={(e) => {
                  handleTitleInputBlur(e)
                }}
                css={css`
                  font-size: 1.1em;
                  font-weight: 600;
                  padding-left: 20px;
                `}
              />

              <Button onClick={() => setModalState(ModalState.NEW_DRAFT)}>
                New Draft
              </Button>
            </div>
          </div>
        </div>
        <EditReviewView
          visible={stackSelected ? upwell.rootDraft.id : draft.id}
          id={id}
          editable={!stackSelected}
          historyHeads={historyHeads}
          onClick={handleOnClickEditor}
        />
      </div>
      <div
        id="comments"
        css={css`
          width: 19vw;
          max-width: 300px;
          flex: 0 1 auto;
          background: rgba(0, 0, 0, 0.2);
          color: white;
          overflow: auto;
          padding-top: 36px;
        `}
      >
        <CommentSidebar draft={draft} id={id} />
      </div>
    </div>
  )
}

function hasUnresolvedComments(comments: Comments): boolean {
  return (
    0 <= Object.values(comments).findIndex((c) => c.state === CommentState.OPEN)
  )
}
