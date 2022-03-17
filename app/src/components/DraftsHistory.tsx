/** @jsxImportSource @emotion/react */
import { css } from '@emotion/react/macro'
import { Layer } from 'api'
import { MouseEventHandler, useState } from 'react'
import { Link } from 'wouter'
import Documents from '../Documents'
import { Button } from './Button'
import ClickableDraftList from './ClickableDraftList'

let documents = Documents()

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

type Props = {
  layers: Layer[]
  archivedLayers?: Layer[]
  id: string
  onGetMoreClick?: MouseEventHandler<HTMLButtonElement>
}
export default function DraftsHistory({
  layers,
  archivedLayers = [],
  id,
  onGetMoreClick,
}: Props) {
  const upwell = documents.get(id)
  let [tab, setTab] = useState<Tab>(Tab.DRAFTS)
  const [isExpanded, setExpanded] = useState<boolean>(true)

  function goToDraft(did: string) {
    window.location.hash = did
  }
  function handleTabClick(tab: Tab) {
    return () => {
      setTab(tab)
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
            layers={layers.filter((l) => l.id !== upwell.rootLayer.id)}
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
            />

            {onGetMoreClick && (
              <Button onClick={onGetMoreClick}>load more</Button>
            )}
          </>
        )}
      </div>
    </div>
  )
}
