/** @jsxImportSource @emotion/react */
import { css, Interpolation, Theme } from '@emotion/react/macro'

type ButtonType = React.ClassAttributes<HTMLButtonElement> &
React.ButtonHTMLAttributes<HTMLButtonElement>

export function EmojiButton(props: ButtonType) {
  return (
    <button
      css={css`
        font-size: 16px;
        border: none;
        cursor: pointer;
        display: inline-flex;
        flex-direction: row;
        align-items: center;
        justify-content: center;
        background: transparent;
        color: black;
        padding: 0;
      `}
      {...props}
    />
  )
}
