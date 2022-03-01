/** @jsxImportSource @emotion/react */
import { css, Interpolation, Theme } from "@emotion/react/macro";
import React from "react";
import { Layer } from "api";
import { JSX } from "@emotion/react/jsx-runtime";
//@ts-ignore
import relativeDate from "relative-date";
import {TextareaInput} from "./Input";

const tabStyles = css`
  border: 1px #b9b9b9 solid;
  background: white;
  border-left: 1px solid lightgray;
  margin-right: 16px;
  padding: 12px 10px 12px 10px;
  border-radius: 0 10px 10px 0; /* top rounded edges */
  box-sizing: content-box;
  line-height: 16px;
`;
const tabVisibleStyles = css`
  background: white;
  border: 1px lightgray solid;
  border-radius: 0 10px 10px 0; /* top rounded edges */
  padding-left: 27px;
  margin-right: 0;
  min-height: 60px;
  max-height: 120px;
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
      display: inline-block;
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
  isMerged?: boolean;
  "aria-pressed": boolean;
} & React.ClassAttributes<HTMLDivElement> &
  React.ButtonHTMLAttributes<HTMLDivElement>;

const fileTabBottomStyles = css`
  border-radius: 0 10px 0 0; /* top rounded edge only */
  border-width: 1px 1px 0px 1px;
  margin-top: 0;
  margin-bottom: -6px;
`;
const fileTabMergedStyles = css`
  background: #eaeaea;
`;

export const FileTab = ({
  index,
  isBottom = false,
  isMerged = false,
  "aria-pressed": isVisible,
  ...props
}: TabType) => (
  <div
    css={css`
      ${tabStyles};
      min-height: 40px;
      text-align: end;
      margin-top: -6px;
      max-width: 110px;
      border-radius: 0 0 10px 0; /* bottom rounded edge only */
      cursor: pointer;
      max-height: 80px;
      z-index: ${isBottom ? 1000 + index : 1000 - index};
      ${isVisible ? tabVisibleStyles : ""}
      ${isBottom ? fileTabBottomStyles : ""}
      ${isMerged ? fileTabMergedStyles : ""}

      &:hover {
        background: #d1eaff;
      }
      &:first-child {
        margin-top: 0px;
        border-radius: 0 10px 10px 0;
      }
    `}
    role="button"
    onClick={props.onClick}
    {...props}
  />
);

export const sidewaysTabStyle = css`
  display: flex;
  flex-direction: column;
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
  onInputBlur: Function;
  editableLayer?: Layer;
  layers: Layer[];
  visible: Layer[];
  handleShareClick?: any; // TODO
  isBottom?: boolean;
  isMerged?: boolean;
};

export default function ListDocuments({
  layers,
  onLayerClick,
  handleShareClick,
  onInputBlur,
  editableLayer,
  visible,
  isBottom = false,
  isMerged = false,
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
            isMerged={isMerged}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onLayerClick(layer);
            }}
            title={`by ${layer.author}, ${relativeDate(new Date(layer.time))}`}
            css={css`
              display: flex;
              flex-direction: row;
              justify-content: flex-start;
              align-items: flex-start;
              ${editableLayer?.id === layer.id ? editableTabStyle : ""}
            `}
          >
            {/* <span css={{ color: "lightgray" }}>{layer.id.slice(0, 2)}</span> */}
            <TextareaInput
              defaultValue={layer.message}
              placeholder="layer name"
              onClick={(e) => {
                e.stopPropagation();
              }}
              onChange={(e) => {
                e.stopPropagation();
              }}
              onBlur={(e) => {
                onInputBlur(e, layer);
              }}
            />
            {!layer.shared && (
              <EmojiButton
                css={wiggleStyle}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
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
                ↓
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
        padding: 0;
      `}
      {...props}
    />
  );
}
