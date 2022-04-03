/** @jsxImportSource @emotion/react */
import { css } from '@emotion/react/macro'
import LoadingIcons from 'react-loading-icons'
import { SYNC_STATE } from '../types'

export function SyncIndicator(props: { state: SYNC_STATE }) {
  let indicator
  switch (props.state) {
    case SYNC_STATE.SYNCED:
      indicator = <span>✔️</span>
      break
    case SYNC_STATE.ERROR:
      indicator = <LoadingIcons.Bars fill="red" speed="0" />
      break
    case SYNC_STATE.OFFLINE:
      indicator = <span>Offline</span>
      break
    default:
      indicator = <span>Saving...</span>
      break
  }
  return (
    <div
      css={css`
        font-size: 0.5em;
        svg {
          color: white;
          width: 20px;
        }
      `}
      id="sync-indicator"
    >
      {indicator}
    </div>
  )
}
