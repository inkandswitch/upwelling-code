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
      indicator = <LoadingIcons.Bars fill="grey" speed="0" />
      break;
    case SYNC_STATE.PREVIEW:
      indicator = <LoadingIcons.Bars fill="blue" speed="0" />
      break;
    default:
      indicator = <LoadingIcons.Circles speed="1" stroke="yellow" />
      break;
  }
  return <span css={css`
  svg {
    width: 20px;
  }
  `} id = "sync-indicator" >
    {indicator}

  </span>
}
