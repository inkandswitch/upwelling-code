/** @jsxImportSource @emotion/react */
import { css } from "@emotion/react/macro";        
import React, { useEffect } from "react";
import { Upwell, Author, Layer } from "api";
import { ReviewView } from "./Review";
import { TextAreaView } from "./TextArea";

export function EditReviewView(props: {upwell: Upwell, editableLayer?: Layer}) {

  const { upwell, editableLayer } = props;

  let [ reviewMode, setReviewMode ] = React.useState<Boolean>(true);

  return (
        <div css={css` width: 100%;`}>
          { !editableLayer && ( <div>Pick a layer!</div> ) }
          { editableLayer && (
            <div>
                <button css={css`margin-bottom: 1ex`} onClick={() => setReviewMode(!reviewMode)}>toggle mode</button>
                ({ reviewMode ? 'review' : 'edit' })

              {/* <textarea className="title" value={state.title} onChange={(e) => onTextChange(e, 'title')}></textarea> */}

              { reviewMode && <ReviewView upwell={upwell} editableLayer={editableLayer}></ReviewView> }
              { !reviewMode && (<TextAreaView upwell={upwell} editableLayer={editableLayer}></TextAreaView>) }
            </div>
          )}

        </div>
  )
} 
