/** @jsxImportSource @emotion/react */
import { css } from "@emotion/react/macro";
import LoadingIcons from 'react-loading-icons'
import { SYNC_STATE } from '../types';

export function SyncIndicator (props: { state: SYNC_STATE }) {
  let indicator
  switch(props.state) {
    case SYNC_STATE.SYNCED:
      indicator = <div>✔️</div>
      break;
    case SYNC_STATE.ERROR:
      indicator = <LoadingIcons.Bars fill="red" speed="0" />
      break;
    case SYNC_STATE.OFFLINE:
      indicator = <div>Offline</div>
      break;
    default:
      indicator = <div>Saving...</div>
      break;
  }
  return <span css={css`
  position: fixed;
  top: 5px;
  left: 5px;
  font-size: .5em;
  svg {
    width: 20px;
  }
  `} id = "sync-indicator" >
    {indicator}

  </span>
}
