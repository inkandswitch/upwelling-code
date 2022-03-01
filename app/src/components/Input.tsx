/** @jsxImportSource @emotion/react */
import { css } from "@emotion/react/macro";
import React from "react";

const inputStyle = css`
  font-size: inherit;
  display: inline-flex;
  background: none;
  box-sizing: border-box;
  border: 1px solid transparent;
  color: black;
  font-family: monospace;
  padding: 0;
  border-radius: 0; /* phone user agents like to add border radius */
  height: 100%;
  text-overflow: ellipsis;
  overflow: hidden;
  cursor: text;
  &:hover {
    border: 1px solid blue;
  }
  &:focus {
    outline: 0;
    border: 1px solid blue;
    transition: 0.2s;
  }
  &::placeholder {
    font-style: italic;
  }
`;

type InputProps = React.ClassAttributes<HTMLInputElement> &
  React.InputHTMLAttributes<HTMLInputElement>;

const Input = (props: InputProps) => (
  <input
    css={css`
      ${inputStyle}
    `}
    type="text"
    {...props}
  />
);
export default Input;

export const TextareaInput = (
  props: JSX.IntrinsicAttributes &
    React.ClassAttributes<HTMLTextAreaElement> &
    React.TextareaHTMLAttributes<HTMLTextAreaElement>
) => (
  <textarea
    css={css`
      ${inputStyle}
      resize: none;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
    `}
    {...props}
  />
);
