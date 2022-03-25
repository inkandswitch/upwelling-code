/** @jsxImportSource @emotion/react */
import { useEffect } from 'react'
import { css } from '@emotion/react/macro'
import { Draft } from 'api'
import { useState } from 'react'
import { Link } from 'wouter'
import Documents from '../Documents'
import { Button } from './Button'
import ClickableDraftList, { AuthorColorsType } from './ClickableDraftList'

let documents = Documents()

const HISTORY_FETCH_SIZE = 5

enum Tab {
  DRAFTS,
  HISTORY,
}

type TabProps = {
  isActive: boolean
} & React.ComponentProps<typeof Link>

function SidebarTab({ isActive = false, ...props }: TabProps) {
  const TabStyle = css`
    display: inline-block;
    border: none;
    margin: 0 6px;
    text-decoration: none;
    padding: 8px 14px;
    cursor: pointer;
    background: none;
    color: ${isActive ? 'black' : 'gray'};
    border-bottom: 3px solid ${isActive ? 'gray' : 'transparent'};
  `
  return <button css={TabStyle} {...props} />
}

export const TabWrapper = (props: any) => (
  <div
    css={css`
      display: flex;
      flex-wrap: nowrap;
    `}
    {...props}
  />
)

// only get the drafts you can see:
// - your private drafts
// - shared drafts
function getYourDrafts(drafts: Draft[], rootId: string) {
  const yourId = documents.author.id

  return drafts.filter((l) => {
    // don't show root draft
    if (l.id === rootId) {
      return false
    }
    // don't show if it's someone elses' and not shared
    if (l.authorId !== yourId && !l.shared) {
      return false
    }
    return true
  })
}

type Props = {
  drafts: Draft[]
  epoch: number
  id: string
  did: string
  goToDraft: Function
  setHistorySelection: (id: string) => void
  colors?: AuthorColorsType
}
export default function DraftsHistory({
  epoch,
  drafts,
  id,
  did,
  goToDraft,
  setHistorySelection,
  colors = {},
}: Props) {
  const upwell = documents.get(id)
  let [tab, setTab] = useState<Tab>(Tab.DRAFTS)
  const [isExpanded, setExpanded] = useState<boolean>(true)
  let [archivedDrafts, setHistory] = useState<Draft[]>([])
  let [noMoreHistory, setNoMoreHistory] = useState<boolean>(false)
  let [fetchSize, setFetchSize] = useState<number>(HISTORY_FETCH_SIZE)

  function handleTabClick(tab: Tab) {
    return () => {
      setTab(tab)
    }
  }

  useEffect(() => {
    let upwell = documents.get(id)
    const moreHistory: Draft[] = []
    for (let i = 0; i < fetchSize; i++) {
      let value = upwell.history.get(i)
      if (value) moreHistory.push(value)
    }
    setNoMoreHistory(upwell.history.length <= fetchSize)
    setHistory(moreHistory)
  }, [id, fetchSize, epoch])

  function onGetMoreClick() {
    setFetchSize(fetchSize + HISTORY_FETCH_SIZE)
  }

  const handleShareClick = (draft: Draft) => {
    if (
      // eslint-disable-next-line no-restricted-globals
      confirm("Do you want to share your draft? it can't be unshared.")
    ) {
      let upwell = documents.get(id)
      upwell.share(draft.id)
    }
  }

  return (
    <div
      css={css`
        display: flex;
        flex-direction: row;
      `}
    >
      {!isExpanded && (
        <Button
          css={css`
            font-size: 24px;
            color: #00000080;
            top: 30px;
            left: 14px;
            background: transparent;
            position: absolute;
            z-index: 100;
          `}
          onClick={() => setExpanded(true)}
        >
          »
        </Button>
      )}
      <div
        id="sidebar"
        css={css`
          background: white;
          margin: 30px;
          align-self: flex-start;
          align-items: center;
          border-bottom: 3px solid transparent;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          max-width: 210px;
          ${!isExpanded ? `max-width: 0;` : ''}
          overflow: hidden;
          z-index: 101;
        `}
      >
        <TabWrapper>
          <SidebarTab
            onClick={handleTabClick(Tab.DRAFTS)}
            isActive={tab === Tab.DRAFTS}
          >
            Drafts
          </SidebarTab>
          <SidebarTab
            onClick={handleTabClick(Tab.HISTORY)}
            isActive={tab === Tab.HISTORY}
          >
            History
          </SidebarTab>
          <Button
            css={css`
              font-size: 24px;
              color: #00000052;
            `}
            onClick={() => setExpanded(false)}
          >
            «
          </Button>
        </TabWrapper>
        {tab === Tab.DRAFTS ? (
          <ClickableDraftList
            css={css`
              width: 206px;
            `}
            id={id}
            did={did}
            onDraftClick={(draft: Draft) => goToDraft(draft.id)}
            onShareClick={handleShareClick}
            drafts={getYourDrafts(drafts, upwell.rootDraft.id)}
            colors={colors}
          />
        ) : (
          <>
            <ClickableDraftList
              css={css`
                width: 206px;
              `}
              id={id}
              did={did}
              onDraftClick={(draft: Draft) => setHistorySelection(draft.id)}
              drafts={archivedDrafts}
              colors={colors}
            />

            {!noMoreHistory && (
              <Button onClick={onGetMoreClick}>load more</Button>
            )}
          </>
        )}
      </div>
    </div>
  )
}
