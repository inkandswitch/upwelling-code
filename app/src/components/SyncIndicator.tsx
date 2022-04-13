/** @jsxImportSource @emotion/react */
import { css } from '@emotion/react/macro'
import { SYNC_STATE } from '../types'

export function SyncIndicator(props: { state: SYNC_STATE }) {
  let indicator
  switch (props.state) {
    case SYNC_STATE.SYNCED:
      indicator = <span></span>
      break
    case SYNC_STATE.ERROR:
      indicator = <span>in error</span>
      break
    case SYNC_STATE.OFFLINE:
      indicator = <span>You are offline, but you can still edit.</span>
      break
    default:
      indicator = <span></span>
      break
  }
  return (
    <div
      css={css`
        svg {
          color: white;
          width: 20px;
        }
        margin: 0px;
        padding: 10px;
        font-size: 10px;
        color: #a2a5a6;
        text-align: center;
      `}
      id="sync-indicator"
    >
      {indicator}
    </div>
  )
}
