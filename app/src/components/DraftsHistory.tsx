/** @jsxImportSource @emotion/react */
import { useEffect, useCallback } from 'react'
import { css } from '@emotion/react/macro'
import { Layer } from 'api'
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

// only get the layers you can see:
// - your private layers
// - shared layers
function getYourLayers(layers: Layer[], rootId: string) {
  const yourId = documents.author.id

  return layers.filter((l) => {
    return (
      // keep it if it isn't the root layer
      l.id !== rootId ||
      // keep it if it's someone else's layer and it's shared
      (l.id !== yourId && l.shared)
    )
  })
}

type Props = {
  layers: Layer[]
  id: string
  colors?: AuthorColorsType
}
export default function DraftsHistory({ layers, id, colors = {} }: Props) {
  const upwell = documents.get(id)
  let [tab, setTab] = useState<Tab>(Tab.DRAFTS)
  const [isExpanded, setExpanded] = useState<boolean>(true)
  let [archivedLayers, setHistory] = useState<Layer[]>([])
  let [noMoreHistory, setNoMoreHistory] = useState<boolean>(false)
  let [fetchSize, setFetchSize] = useState<number>(HISTORY_FETCH_SIZE)

  const getHistory = useCallback(() => {
    let upwell = documents.get(id)
    const moreHistory: Layer[] = []
    for (let i = 0; i < fetchSize; i++) {
      let value = upwell.history.get(i)
      if (value) moreHistory.push(value)
    }
    setNoMoreHistory(upwell.history.length <= fetchSize)
    setHistory(moreHistory)
  }, [id, fetchSize])

  function goToDraft(did: string) {
    window.location.hash = did
  }

  function handleTabClick(tab: Tab) {
    return () => {
      setTab(tab)
    }
  }

  useEffect(() => {
    getHistory()
  }, [getHistory])

  function onGetMoreClick() {
    setFetchSize(fetchSize + HISTORY_FETCH_SIZE)
  }

  const handleShareClick = (layer: Layer) => {
    if (
      // eslint-disable-next-line no-restricted-globals
      confirm("Do you want to share your layer? it can't be unshared.")
    ) {
      let upwell = documents.get(id)
      upwell.share(layer.id)
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
            onLayerClick={(layer: Layer) => goToDraft(layer.id)}
            onShareClick={handleShareClick}
            layers={layers.filter((l) => l.id !== upwell.rootLayer.id)}
            colors={colors}
          />
        ) : (
          <>
            <ClickableDraftList
              css={css`
                width: 206px;
              `}
              id={id}
              onLayerClick={(layer: Layer) => goToDraft(layer.id)}
              layers={archivedLayers}
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
