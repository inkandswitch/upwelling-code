/** @jsxImportSource @emotion/react */
import { css, Interpolation, Theme } from "@emotion/react/macro";
import React from "react";
import { Layer } from "api";
import { JSX } from "@emotion/react/jsx-runtime";

const tabStyles = css`
  border: 1px #b9b9b9 solid;
  background: #eaeaea;
  border-left: 1px solid lightgray;
  border-top: 0;
  margin-right: 8px;
  padding: 12px 4px 12px 4px;
  border-radius: 0 10px 10px 0; /* top rounded edges */
  box-sizing: content-box;
  line-height: 16px;
`;
const tabVisibleStyles = css`
  background: white;
  border: 1px lightgray solid;
  border-radius: 0 10px 10px 0; /* top rounded edges */
  padding-left: 12px;
  margin-right: 0;
  min-height: 60px;
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
  isBottom?: boolean;
  "aria-pressed": boolean;
} & React.ClassAttributes<HTMLDivElement> &
  React.ButtonHTMLAttributes<HTMLDivElement>;

const fileTabBottomStyles = css`
  border-radius: 0 10px 0 0; /* top rounded edge only */
  border-width: 1px 1px 0px 1px;
  min-width: 19px;
  margin-top: 0;
  margin-bottom: -6px;
`;

export const FileTab = ({
  index,
  isBottom = false,
  "aria-pressed": isVisible,
  ...props
}: TabType) => (
  <div
    css={css`
      ${tabStyles};
      min-height: 40px;
      text-align: end;
      margin-top: -6px;
      min-width: 20px;
      border-radius: 0 0 10px 0; /* bottom rounded edge only */
      cursor: pointer;
      z-index: ${isBottom ? 1000 + index : 1000 - index};
      ${isVisible ? tabVisibleStyles : ""}
      ${isBottom ? fileTabBottomStyles : ""}

      &:hover {
        background: #d1eaff;
      }
    `}
    role="button"
    onClick={props.onClick}
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

const editableTabStyle = css`
  background: white;
  border-left: 0;
  border-radius: 0 10px 10px 0; /* top rounded edges */
`;

type Props = {
  onLayerClick: Function;
  editableLayer?: Layer;
  layers: Layer[];
  visible: Layer[];
  handleShareClick: any; // TODO
  isBottom?: boolean;
};

export default function ListDocuments({
  layers,
  onLayerClick,
  handleShareClick,
  editableLayer,
  visible,
  isBottom = false,
}: Props) {
  return (
    <div
      css={css`
        ${sidewaysTabStyle}
        ${isBottom ? "overflow: unset;" : ""}
      `}
    >
      {layers.map((layer: Layer, index) => {
        let visibleMaybe = visible.findIndex((l) => l.id === layer.id);
        return (
          <FileTab
            key={layer.id}
            aria-pressed={visibleMaybe > -1}
            index={index}
            isBottom={isBottom}
            onClick={() => onLayerClick(layer)}
            title={`by ${layer.author}`}
            css={css`
              display: flex;
              flex-direction: row;
              justify-content: space-between;
              ${editableLayer?.id === layer.id ? editableTabStyle : ""}
            `}
          >
            {!layer.shared && (
              <EmojiButton
                css={wiggleStyle}
                onClick={(e) => {
                  e.preventDefault();
                  if (
                    // eslint-disable-next-line no-restricted-globals
                    confirm(
                      "Do you want to share your layer? it can't be unshared."
                    )
                  ) {
                    handleShareClick(layer);
                  }
                }}
              >
                →
              </EmojiButton>
            )}
            {editableLayer?.id === layer.id && (
              <div
                css={css`
                  margin-right: 3px;
                  margin-bottom: 3px;
                  display: inline-block;
                `}
              >
                ✏️
              </div>
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
        padding: 0;
        &:hover {
          // background: red;
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
