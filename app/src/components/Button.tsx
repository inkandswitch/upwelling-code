/** @jsxImportSource @emotion/react */
import { css } from '@emotion/react/macro'

type ButtonType = React.ClassAttributes<HTMLButtonElement> &
  React.ButtonHTMLAttributes<HTMLButtonElement>

export function Button(props: ButtonType) {
  return (
    <button
      css={css`
        padding: 3px 14px;
        font-size: 14px;
        border-radius: 3px;
        border: none;
        font-weight: 500;
        cursor: pointer;
        display: inline-flex;
        flex-direction: row;
        align-items: center;
        justify-content: center;
        background: white;
        color: black;
        &:hover {
          background: #d1eaff;
        }
        &:disabled {
          opacity: 70%;
          cursor: not-allowed;
          filter: grayscale(40%) brightness(90%);
        }
      `}
      {...props}
    />
  )
}
