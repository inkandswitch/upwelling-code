/** @jsxImportSource @emotion/react */
import { Upwell } from 'api'
import { css } from '@emotion/react/macro'
import deterministicColor from '../color'

type Props = {
  upwell: Upwell
  contributors: string[]
}
export default function Contributors(props: Props) {
  return (
    <div
      css={css`
        display: flex;
        flex-direction: row;
        column-gap: 6px;
      `}
    >
      {props.contributors.map((id, index) => {
        let name = props.upwell.getAuthorName(id)
        return (
          <div
            css={css`
              overflow: hidden;
              background: white; /* icon background needs a white backdrop to match others because of semi-transparency */

              border-radius: 50%;
            `}
            key={id}
            title={name}
          >
            <div
              css={css`
                background: ${deterministicColor(index)};
                font-size: 18px;
                line-height: 18px;
                height: 1.5rem;
                width: 1.5rem;
                display: flex;
                align-items: center;
                justify-content: center;
                padding-top: 3px;
              `}
            >
              {name?.slice(0, 1)}
            </div>
          </div>
        )
      })}
    </div>
  )
}
