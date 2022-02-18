/** @jsxImportSource @emotion/react */
import { css } from "@emotion/react/macro";
import { AttributesOf } from "@atjson/document";
import * as React from "react";
import { Paragraph as Annotation } from "../upwell-source";

export const Paragraph: React.FC<AttributesOf<Annotation>> = (props) => {
  return (
    <p>{props.children}</p>
  );
};
