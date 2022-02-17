/** @jsxImportSource @emotion/react */
import { css } from "@emotion/react/macro";        
import React  from "react";
import { Layer } from "api";
import { ReviewView } from "./Review";
import { TextAreaView } from "./TextArea";


// visible 0 or more layers NOT including root
// root

type Props = { visible: Layer[], root: Layer | undefined, onChange: any}

export function EditReviewView(props: Props) {

  const { root, visible, onChange } = props;

  let [reviewMode, setReviewMode] = React.useState<Boolean>(true);
  if (!root) return <div></div>

  return (
    <div css={css` width: 100%;`}>
          {!visible.length && <ReviewView visible={visible} rootLayer={root}></ReviewView>}
          {visible.length > 1 && (
            <ReviewView visible={visible} rootLayer={root}></ReviewView>
          )}
          { visible.length === 1 && (
            <div>
                <button css={css`margin-bottom: 1ex`} onClick={() => setReviewMode(!reviewMode)}>toggle mode</button>
                ({ reviewMode ? 'review' : 'edit' })

              {/* <textarea className="title" value={state.title} onChange={(e) => onTextChange(e, 'title')}></textarea> */}

              { reviewMode && <ReviewView visible={visible} rootLayer={root}></ReviewView> }
          {!reviewMode && (<TextAreaView onChange={onChange} editableLayer={visible[0]}></TextAreaView>) }
            </div>
          )}

        </div>
  )
} 
