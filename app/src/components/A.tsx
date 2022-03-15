/** @jsxImportSource @emotion/react */
import { css } from '@emotion/react/macro'
import { Link } from 'wouter'

function A({ children, href, ...props }: any) {
  return (
    <Link
      href={href}
      {...props}
      css={css`
        display: inline-block;
        color: black;
        padding: 2px 8px;
        &:first-of-type {
          padding-left: 0;
        }
      `}
    >
      {children}
    </Link>
  )
}
export default A
