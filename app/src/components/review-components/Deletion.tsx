/** @jsxImportSource @emotion/react */
import { css } from "@emotion/react/macro";
import { AttributesOf } from "@atjson/document";
import * as React from "react";
import { Deletion as Annotation } from "../upwell-source";

export const Delete: React.FC<AttributesOf<Annotation>> = (props) => {
  return (
    <span css={css`color: red;`} className="deletion">{props.text}</span>
  );
};
