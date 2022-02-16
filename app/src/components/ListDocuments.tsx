/** @jsxImportSource @emotion/react */
import { css, Interpolation, Theme } from "@emotion/react/macro";
import React from "react";
import { Layer } from "api";
import { JSX } from "@emotion/react/jsx-runtime";

type Props = {
  onLayerClick: Function;
  layers: Layer[];
};

const tabStyles = css`
  border: 1px #bbc6ff solid;
  border-left: 0;
  border-top: 0;
  margin-right: 6px;
  padding: 12px 4px 12px 4px;
  border-radius: 0 10px 10px 0; /* top rounded edges */
  box-sizing: content-box;
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
      border-radius: 0 6px 6px 0;
      background: white;
      cursor: pointer;

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

const FileTab = ({ index, "aria-pressed": isVisible, ...props }: TabType) => (
  <div
    css={css`
      ${tabStyles};
      margin-top: -6px;
      border-radius: 0 0 10px 0; /* front rounded edge only */
      background: ${isVisible ? "#d1eaff" : "white"};
      cursor: pointer;
      z-index: ${1000 - index};

      // &:first-of-type {
      // }

      &:hover {
        border-radius: 0 10px 10px 0; /* top rounded edges */
        padding-left: 10px;
        margin-right: 0;
      }
    `}
    role="button"
    {...props}
  />
);

export default function ListDocuments({ layers, onLayerClick }: Props) {

  return (
    <div
      css={css`
        writing-mode: vertical-rl;
        text-orientation: mixed;
        display: flex;
        flex-direction: row;
        align-items: flex-end;
        margin-top: 6px;
      `}
    >
      {layers.map((layer: Layer, index) => {
        return (
          <FileTab
            key={layer.id}
            aria-pressed={layer.visible}
            index={index}
            onClick={() => onLayerClick(layer)}
          >
            {layer.id.slice(0, 4)}
            {/* TODO add author and time  */}
          </FileTab>
        );
      })}
    </div>
  );
}
