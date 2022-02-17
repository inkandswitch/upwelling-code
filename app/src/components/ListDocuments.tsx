/** @jsxImportSource @emotion/react */
import { css, Interpolation, Theme } from "@emotion/react/macro";
import React from "react";
import { Layer } from "api";
import { JSX } from "@emotion/react/jsx-runtime";

const tabStyles = css`
  border: 1px #bbc6ff solid;
  border-left: 0;
  border-top: 0;
  margin-right: 8px;
  padding: 12px 4px 12px 4px;
  border-radius: 0 10px 10px 0; /* top rounded edges */
  box-sizing: content-box;
  background: white;
  line-height: 16px;
`;
const tabVisibleStyles = css`
  border-radius: 0 10px 10px 0; /* top rounded edges */
  padding-left: 12px;
  margin-right: 0;
`;

const wiggleStyle = css`
  @keyframes wiggle {
    0% {
      transform: rotate(25deg);
    }
    20% {
      transform: rotate(-25deg);
    }
    35% {
      transform: rotate(0deg);
    }
    95% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(0deg);
    }
  }

  &:hover {
    display: inline-block;
    animation: wiggle 2.5s infinite;
  }
`;

export const InfoTab = (
  props: JSX.IntrinsicAttributes & {
    css?: Interpolation<Theme>;
  } & React.ClassAttributes<HTMLDivElement> &
    React.HTMLAttributes<HTMLDivElement> & { css?: Interpolation<Theme> }
) => (
  <div
    css={css`
      ${tabStyles};
      background: none;
      border: none;
    `}
    {...props}
  />
);

export const ButtonTab = (
  props: JSX.IntrinsicAttributes & {
    css?: Interpolation<Theme>;
  } & React.ClassAttributes<HTMLDivElement> &
    React.HTMLAttributes<HTMLDivElement> & { css?: Interpolation<Theme> }
) => (
  <div
    css={css`
      ${tabStyles};
      ${wiggleStyle}
      border-radius: 0 6px 6px 0;
      background: white;
      cursor: pointer;
    `}
    role="button"
    {...props}
  />
);

type TabType = {
  index: number;
  "aria-pressed": boolean;
} & React.ClassAttributes<HTMLDivElement> &
  React.ButtonHTMLAttributes<HTMLDivElement>;

export const FileTab = ({
  index,
  "aria-pressed": isVisible,
  ...props
}: TabType) => (
  <div
    css={css`
      ${tabStyles};
      margin-top: -6px;
      border-radius: 0 0 10px 0; /* front rounded edge only */
      cursor: pointer;
      z-index: ${1000 - index};
      ${isVisible ? tabVisibleStyles : ""}

      &:hover {
        background: #d1eaff;
      }
    `}
    role="button"
    {...props}
  />
);

export const sidewaysTabStyle = css`
  writing-mode: vertical-rl;
  text-orientation: mixed;
  display: flex;
  flex-direction: row;
  align-items: flex-end;
  overflow: auto; /* scroll tabs when they collide */
`;

type Props = {
  onLayerClick: Function;
  editableLayer?: Layer;
  layers: Layer[];
  handleShareClick: any; // TODO
};

export default function ListDocuments({
  layers,
  onLayerClick,
  handleShareClick,
  editableLayer,
}: Props) {
  return (
    <div css={sidewaysTabStyle}>
      {layers.map((layer: Layer, index) => {
        return (
          <FileTab
            key={layer.id}
            aria-pressed={layer.visible}
            index={index}
            onClick={() => onLayerClick(layer)}
            title={`by ${layer.author}`}
            css={css`
              ${editableLayer?.id === layer.id ? "background: #d6d7ff;" : ""}
            `}
          >
            {layer.id.slice(0, 4)}
            {!layer.shared && (
              <EmojiButton
                css={wiggleStyle}
                onClick={(e) => {
                  e.preventDefault();
                  handleShareClick(layer);
                }}
              >
                👀
              </EmojiButton>
            )}
          </FileTab>
        );
      })}
    </div>
  );
}

type ButtonType = React.ClassAttributes<HTMLButtonElement> &
  React.ButtonHTMLAttributes<HTMLButtonElement>;

function EmojiButton(props: ButtonType) {
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
        &:hover {
          background: red;
        }
        &:disabled {
          opacity: 70%;
          cursor: not-allowed;
          filter: grayscale(40%) brightness(90%);
        }
      `}
      {...props}
    />
  );
}
