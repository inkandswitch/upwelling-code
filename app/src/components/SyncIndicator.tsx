/** @jsxImportSource @emotion/react */
import { css } from '@emotion/react/macro'
import { SYNC_STATE } from '../types'

export function SyncIndicator(props: { state: SYNC_STATE }) {
  let indicator
  switch (props.state) {
    case SYNC_STATE.SYNCED:
      indicator = <span>synced️</span>
      break
    case SYNC_STATE.ERROR:
      indicator = <span>in error</span>
      break
    case SYNC_STATE.OFFLINE:
      indicator = <span>offline</span>
      break
    default:
      indicator = <span>saving</span>
      break
  }
  return (
    <span
      css={css`
        svg {
          color: white;
          width: 20px;
        }
      `}
      id="sync-indicator"
    >
      {indicator}
    </span>
  )
}
