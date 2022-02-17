import * as React from "react";

export const Root: React.FC<{}> = (props) => {
  return (
    <article>{props.children}</article>
  );
}
