/** @jsxImportSource @emotion/react */
import { css, Interpolation, Theme } from "@emotion/react/macro";
import React,{useEffect, useState} from "react";
import { Layer } from "api";
import { JSX } from "@emotion/react/jsx-runtime";
//@ts-ignore
import relativeDate from "relative-date";
import { TextareaInput } from "./Input";
import Documents from '../Documents'

let documents = Documents()

const tabStyles = css`
  border: 1px #b9b9b9 solid;
  background: #eaeaea;
  border-left: 1px solid lightgray;
  margin-right: 16px;
  padding: 12px 10px 12px 10px;
  border-radius: 0 10px 10px 0; /* top rounded edges */
  box-sizing: content-box;
  line-height: 16px;
`;

const extendedTabStyles = css`
  border: 1px lightgray solid;
  padding-left: 27px;
  margin-right: 0;
  border-radius: 0 10px 10px 0; /* top rounded edges */
`;

const tabVisibleStyles = css`
  ${extendedTabStyles}
  background: white;
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
      color: white;
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
  ${extendedTabStyles}
  background: gray;
  border-color: #4d4d4d;
  cursor: not-allowed;
  border-left-color: transparent;
  &:hover {
    background: gray;
  }
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
      &:hover {
        background: #d1eaff;
      }
      &:first-of-type {
        margin-top: 0px;
        border-radius: 0 10px 10px 0;
      }
      ${isVisible ? tabVisibleStyles : ""}
      ${isBottom ? fileTabBottomStyles : ""}
      ${isMerged ? fileTabMergedStyles : ""}
    `}
    role="button"
    onClick={props.onClick}
    {...props}
  />
);

export const sidewaysTabStyle = css`
  display: flex;
  flex-direction: column-reverse;
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
  editableLayer?: string;
  id: string,
  visible: string[];
  handleShareClick?: any; // TODO
  handleDeleteClick?: any; // TODO
  isBottom?: boolean;
  isMerged?: boolean;
};

export default function ListDocuments({
  onLayerClick,
  handleShareClick,
  handleDeleteClick,
  onInputBlur,
  editableLayer,
  visible,
  id,
  isBottom = false,
  isMerged = false,
}: Props) {
  let [layers, setLayers] = useState<Layer[]>([])

  useEffect(() => {
    let upwell = documents.get(id)
    setLayers(upwell.layers())
    upwell.subscribe(() => {
      setLayers(upwell.layers())
    })

  }, [id])
 return (
    <div
      css={css`
        ${sidewaysTabStyle}
        ${isBottom ? "overflow: unset;" : ""}
      `}
    >
      {layers.map((layer: Layer, index) => {
        let visibleMaybe = visible.findIndex((id) => id === layer.id);
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
              ${editableLayer === layer.id ? editableTabStyle : ""}
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
            <div>
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
              {!isMerged && (
                <EmojiButton
                  css={wiggleStyle}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (
                      // eslint-disable-next-line no-restricted-globals
                      confirm(
                        "Do you want to delete this layer? you can't get it back as of yet."
                      )
                    ) {
                      handleDeleteClick(layer);
                    }
                  }}
                >
                  🗑
                </EmojiButton>
              )}
            </div>
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
