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
import { ReactComponent as Pancakes } from '../components/icons/Pancakes.svg'
import { ReactComponent as Pancake } from '../components/icons/Pancake.svg'
import { getYourDrafts } from '../util'

const log = debug('DraftView')

let documents = Documents()

type DraftViewProps = {
  did: string
  epoch: number
  id: string
  root: Draft
  author: Author
  sync: () => void
}

export default function DraftView(props: DraftViewProps) {
  let { id, author, did, epoch, sync } = props
  let [reviewMode, setReviewMode] = useState<boolean>(false)

  let upwell = documents.get(id)
  const authors = upwell.metadata.getAuthors()
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
      }, 1000),
    [draft.contributors, id, did]
  )

  let onTextChange = () => {
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

  // const handleFileNameInputBlur = (
  //   e: React.FocusEvent<HTMLInputElement, Element>
  // ) => {
  //   let draftInstance = upwell.get(did)
  //   draftInstance.message = e.target.value
  //   documents.save(id)
  // }

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

  // Hack because the params are always undefined?
  function renderValue() {
    return isLatest ? 'STACK' : draft.message
  }
  // borked?
  // function renderValue(option: SelectOption<DraftMetadata> | null) {
  //   console.log('renderValue', option)
  //   if (option === null || option === undefined) {
  //     return <span>Select a draft...</span>
  //   }
  //   return <span>{option.value.message}</span>
  // }

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
                  <DetailedOption
                    key={upwell.rootDraft.id}
                    option={{
                      ...upwell.rootDraft.materialize(),
                      message: 'STACK',
                      id: 'stack',
                    }}
                    authors={authors}
                    icon={Pancakes}
                    iconStyles={css`
                      margin-left: 0;
                      margin-right: 5px;
                    `}
                  />
                  {getYourDrafts(
                    draftsMeta,
                    upwell.rootDraft.id,
                    author.id
                  ).map((d) => (
                    <DetailedOption
                      key={d.id}
                      option={d}
                      authors={authors}
                      icon={Pancake}
                    />
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
              {/** Edit draft name */}
              {/* {!isLatest && (
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
              )} */}
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
            ) : (
              <div></div>
            )}
            <div
              css={css`
                gap: 20px;
                display: flex;
                flex-direction: row;
                align-items: center;
              `}
            >
              <Contributors upwell={upwell} contributors={draft.contributors} />
              <span>
                show changes{' '}
                <Switch
                  inputProps={{ 'aria-label': 'show changes' }}
                  checked={reviewMode}
                  onClick={() => setReviewMode(!reviewMode)}
                />
              </span>
              <DraftsHistory
                did={did}
                epoch={epoch}
                goToDraft={goToDraft}
                drafts={draftsMeta}
                setHistorySelection={(draftId) => {
                  let draft = upwell.metadata.getDraft(draftId)
                  setHistoryHeads(draft.heads)
                  setEpoch(Date.now())
                }}
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
