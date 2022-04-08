/** @jsxImportSource @emotion/react */
import { css } from '@emotion/react/macro'

import { PropsFor, styled } from '@mui/system'
import { Button as MButton, ButtonProps } from '@mui/material'

const ThemedButton = styled(MButton)<ButtonProps>(({ theme }) => ({
  // color: theme.palette.getContrastText(purple[500]),
  // backgroundColor: purple[500],
  // '&:hover': {
  //   backgroundColor: purple[700],
  // },
}))

export function Button(props: PropsFor<typeof ThemedButton>) {
  return <ThemedButton variant="outlined" {...props} />
}

type ButtonType = React.ClassAttributes<HTMLButtonElement> &
  React.ButtonHTMLAttributes<HTMLButtonElement>

function PlainButton(props: ButtonType) {
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
        background: black;
        color: white;
        &:hover {
          background: lightblue;
          color: black;
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

type IconButtonProps = {
  icon: React.FunctionComponent<React.SVGProps<SVGSVGElement>>
} & ButtonType

export function IconButton({
  icon: Icon,
  children,
  ...props
}: IconButtonProps) {
  return (
    <PlainButton
      css={css`
        position: relative;
        min-height: 24px;
        min-width: 24px;
        padding: 0;
        background: transparent;

        :hover {
          background: transparent;
          svg {
            stroke: red;
          }
        }
      `}
      {...props}
    >
      <Icon
        css={css`
          max-height: 20px;
          max-width: 20px;
          stroke: gray;
        `}
      />
      {children}
    </PlainButton>
  )
}
