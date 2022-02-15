/** @jsxImportSource @emotion/react */
import { css, Interpolation, Theme } from "@emotion/react/macro";
import React from "react";
import { Layer } from "api";

type Props = {
  layers: Layer[];
};

export default function ListDocuments({ layers }: Props) {
  return (
    <div>
      <ul
        css={css`
          padding-inline-start: 0;
        `}
      >
        {layers.map((meta: Layer) => {
          return (
            <li key={meta.id}>
              <a href={`/layer/${meta.id}`}>{meta.message}</a>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
