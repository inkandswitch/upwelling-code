/** @jsxImportSource @emotion/react */
import { css } from '@emotion/react/macro'
import React, { useEffect, useState } from 'react'
import FormControl from '@mui/material/FormControl'
import Switch from '@mui/material/Switch'
import { Upwell, DraftMetadata, Draft, Author } from 'api'
import Documents from '../Documents'
import { EditReviewView } from './EditReview'
import { Button } from './Button'
import Input from './Input'
import DraftsHistory from './DraftsHistory'
import CommentSidebar from './CommentSidebar'
import Contributors from './Contributors'
import debug from 'debug'
import Select, { DetailedOption } from './Select'
import { ReactComponent as Pancake } from '../components/icons/Pancake.svg'
import { ReactComponent as Pancakes } from '../components/icons/Pancakes.svg'
import { getYourDrafts } from '../util'
import InputModal from './InputModal'
import DraftMenu from './DraftMenu'
import { useLocation } from 'wouter'

const log = debug('DraftView')

const blue = '#0083A3'
let documents = Documents()

type DraftViewProps = {
  did: string
  id: string
  root: Draft
  author: Author
  sync: () => void
}

const pancakeCSS = `
  cursor: pointer;
  :hover path {
    fill: lightblue;
  }
`

export default function DraftView(props: DraftViewProps) {
  let { id, author, did, sync } = props
  let [mounted, setMounted] = useState<boolean>(false)
  let [, setLocation] = useLocation()
  let [modalOpen, setModalOpen] = useState<string | undefined>(undefined)
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
  let [hasPendingChanges, setHasPendingChanges] = useState<boolean>(
    draft.id !== 'stack' && upwell.rootDraft.id !== draft.parent_id
  )

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
    documents.subscribe(id, (local: boolean) => {
      let upwell = documents.get(id)
      if (!local && upwell.isArchived(draft.id)) {
        // someone merged or archived my draft while i was looking at it
        setHasPendingChanges(true)
      }
      if (!local && upwell.metadata.main !== draft.parent_id) {
        setHasPendingChanges(true)
      }
      let instance = upwell.get(draft.id)
      if (local) {
        setDraft(instance.materialize())
      }
      upwell.getChangesFromRoot(instance)
      if (!mounted) {
        setMounted(true)
      }
    })
    return () => {
      documents.unsubscribe(id)
    }
  }, [id, draft.parent_id, draft.id, sync, mounted])

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

  let handleUpdateClick = () => {
    window.location.reload()
  }

  const handleOnClickEditor = () => {
    if (stackSelected) {
      let draftInstance = upwell.createDraft(upwell.SPECIAL_UNNAMED_DOCUMENT)
      goToDraft(draftInstance.id)
    }
  }

  const onMerge = async (draftName: string) => {
    let upwell = documents.get(id)
    let draftInstance = upwell.get(draft.id)
    draftInstance.message = draftName
    upwell.rootDraft = draftInstance
    documents.rtcUpwell?.updatePeers()
    goToDraft('stack')
  }

  const handleMergeClick = async () => {
    let upwell = documents.get(id)
    let draftInstance = upwell.get(draft.id)
    if (draftInstance.message.startsWith(Upwell.SPECIAL_UNNAMED_SLUG)) {
      setModalOpen('merge')
    } else {
      upwell.rootDraft = draftInstance
      goToDraft('stack')
    }
  }

  const createDraft = async (draftName: string) => {
    let upwell = documents.get(id)
    let newDraft = upwell.createDraft(draftName)
    documents.rtcUpwell?.updatePeers()
    goToDraft(newDraft.id)
  }

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

  function goToDraft(did: string) {
    documents
      .save(id)
      .catch((err) => {
        console.error('failure to save', err)
      })
      .finally(() => {
        let draftInstance = upwell.get(did)
        setDrafts(upwell.drafts())
        setDraft(draftInstance.materialize())
        const url = `/${id}/${did}`
        setLocation(url)
      })
  }

  function getChanges(draftMeta: DraftMetadata) {
    let draftInstance = upwell.get(draftMeta.id)
    let changes =
      upwell.changes.get(draftMeta.id) ||
      upwell.getChangesFromRoot(draftInstance)
    if (draftMeta.id === upwell.rootDraft.id) {
      changes = 0
    }
    return changes
  }
  // Hack because the params are always undefined?
  function renderDraftMessage(draftMeta: DraftMetadata) {
    if (draftMeta.id === upwell.rootDraft.id) return '(not in a draft)'
    let draftInstance = upwell.get(draftMeta.id)
    return draftInstance.message.startsWith(Upwell.SPECIAL_UNNAMED_SLUG)
      ? 'Untitled'
      : draftInstance.message
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
        open={modalOpen !== undefined}
        onSubmit={modalOpen === 'merge' ? onMerge : createDraft}
        onClose={() => setModalOpen(undefined)}
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
                    goToDraft(value.id)
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
              <Button
                disabled={hasPendingChanges || stackSelected}
                onClick={handleMergeClick}
              >
                Merge
              </Button>
              <DraftMenu
                onEditName={handleEditName}
                onDelete={handleDeleteDraft}
              />
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

              <Button onClick={() => setModalOpen('new-draft')}>
                New Draft
              </Button>
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
                  checked={historyHeads !== false}
                  onClick={() => {
                    if (historyHeads) setHistoryHeads(false)
                    else setHistoryHeads([])
                  }}
                />
                {historyHeads && historyHeads.length > 0
                  ? `showing changes from ${historyTitle}`
                  : 'show changes '}
              </span>
              <DraftsHistory
                did={draft.id}
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
          visible={[stackSelected ? upwell.rootDraft.id : draft.id]}
          id={id}
          author={author}
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
