/** @jsxImportSource @emotion/react */
import { css } from "@emotion/react/macro";        
import React  from "react";
import { Author, Layer } from "api";
import { ReviewView } from "./Review";
import { TextAreaView } from "./TextArea";


// visible 0 or more layers NOT including root
// root

type Props = { visible: Layer[], root: Layer | undefined, onChange: any, author: Author}

export function EditReviewView(props: Props) {

  const { author, root, visible, onChange } = props;

  let [reviewMode, setReviewMode] = React.useState<Boolean>(false);
  if (!root) return <div></div>

  // visible.length === 0 or visible.length > 1
  let reviewView = <ReviewView visible={visible} rootLayer={root}></ReviewView>
  let textArea = <TextAreaView onChange={onChange} editableLayer={visible[0]}></TextAreaView>
  let component = reviewView 
  if (visible.length === 1) {
    if (author !== visible[0].author) {
      component = <ReviewView visible={visible} rootLayer={root}></ReviewView>
    } else {
      component = <React.Fragment>
        {reviewMode ? reviewView : textArea}
        <button css={css`margin-bottom: 1ex`} onClick={() => setReviewMode(!reviewMode)}>toggle mode</button>
        ({reviewMode ? 'review' : 'edit'})
      </React.Fragment>

    }
  }

  return (
    <div css={css` width: 100%;`}>
      {component}
    </div>
  )
} 
