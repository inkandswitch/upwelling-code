/** @jsxImportSource @emotion/react */
import { css } from '@emotion/react/macro'
import { Layer } from 'api'
import { useState } from 'react'
import { Link, useLocation } from 'wouter'
import Documents from '../Documents'
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
}
export default function DraftsHistory({
  layers,
  archivedLayers = [],
  id,
}: Props) {
  const upwell = documents.get(id)
  const [, setLocation] = useLocation()
  let [tab, setTab] = useState<Tab>(Tab.DRAFTS)

  function goToDraft(did: string) {
    let url = `/document/${id}/draft/${did}`
    setLocation(url)
  }
  function handleTabClick(tab: Tab) {
    return () => {
      setTab(tab)
    }
  }
  return (
    <div
      id="sidebar"
      css={css`
        background: white;
        margin: 30px;
        align-self: flex-start;
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
      </TabWrapper>
      {tab === Tab.DRAFTS ? (
        <ClickableDraftList
          id={id}
          onLayerClick={(layer: Layer) => goToDraft(layer.id)}
          layers={layers.filter((l) => l.id !== upwell.rootLayer.id)}
        />
      ) : (
        <>
          <div
            css={css`
              padding: 10px;
            `}
          >
            Put history here!
          </div>
          <ClickableDraftList
            id={id}
            onLayerClick={(layer: Layer) => goToDraft(layer.id)}
            layers={archivedLayers}
          />
        </>
      )}
    </div>
  )
}