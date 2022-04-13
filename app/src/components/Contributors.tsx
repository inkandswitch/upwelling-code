/** @jsxImportSource @emotion/react */
import { Upwell } from 'api'
import { css } from '@emotion/react/macro'
import { getAuthorHighlight } from '../util'

type ContributorProps = {
  authorColor: string
  name: string | undefined
}
export function Contributor({ authorColor, name = '' }: ContributorProps) {
  return (
    <div
      css={css`
        overflow: hidden;

        /* icon background needs a white backdrop to match others because of semi-transparency */
        background: white;

        border-radius: 50%;
        border: 2px solid ${authorColor};
        box-sizing: content-box;
        height: 29px;
        width: 29px;
        line-height: 29px;
        cursor: default;
        flex: 0 0 auto;
      `}
      title={name}
    >
      <div
        css={css`
          text-align: center;
          display: flex;
          justify-content: center;

          /* second background, see parent element for comment */
          background: ${getAuthorHighlight(authorColor)};
        `}
      >
        <span
          css={css`
            display: inline-block;
            vertical-align: middle;
            font-size: 1rem;
          `}
        >
          {name?.slice(0, 1).toUpperCase()}
        </span>
      </div>
    </div>
  )
}

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
      {props.contributors.map((id) => {
        let name = props.upwell.getAuthorName(id)
        return (
          <Contributor
            authorColor={props.upwell.getAuthorColor(id)}
            name={name}
            key={id}
          />
        )
      })}
    </div>
  )
}
