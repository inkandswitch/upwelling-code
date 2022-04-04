/** @jsxImportSource @emotion/react */
import { css } from '@emotion/react/macro'
import React from 'react'
import { ErrorBoundary } from 'react-error-boundary'
import { Author } from 'api'
import { ReviewView } from './Review'
import { Editor } from './Editor'
import Documents from '../Documents'

let documents = Documents()

// visible 0 or more drafts NOT including root
// root

type Props = {
  id: string
  did: string
  visible: string[]
  onChange: any
  heads: string[]
  author: Author
  reviewMode: boolean
}

// @ts-ignore
function ErrorFallback({ error, resetErrorBoundary }) {
  return (
    <div role="alert">
      <p>Something went wrong:</p>
      <pre>{error.message}</pre>
      <button onClick={resetErrorBoundary}>Try again</button>
    </div>
  )
}

export function EditReviewView(props: Props) {
  const { id, heads, visible, onChange, reviewMode, author } = props
  //  let [text, setText] = useState<string | undefined>()
  let upwell = documents.get(id)
  let { did } = props

  // visible.length === 0 or visible.length > 1
  let reviewView = (
    <ReviewView
      upwell={upwell}
      heads={heads}
      changeDraftIds={[did]}
    ></ReviewView>
  )
  let component = reviewView

  let backTheBackUp = () => {
    let draft = upwell.get(did)
    let changes = draft.doc.getChanges([])
    console.log('OH HAI I HAVE THIS TO WORK WITH', changes)
    let oldIsNewAgain = upwell.createDraft(`Recovery from ${draft.title}`)
    oldIsNewAgain.doc.applyChanges(changes.slice(0, changes.length - 1))
    documents.save(id)
    window.location.href = `/${id}/${oldIsNewAgain.id}`
  }

  if (visible.length === 1) {
    let textArea = (
      <ErrorBoundary FallbackComponent={ErrorFallback} onReset={backTheBackUp}>
        <Editor
          upwell={upwell}
          author={author}
          onChange={onChange}
          heads={heads}
          editableDraftId={visible[0]}
          showEdits={reviewMode}
        ></Editor>
      </ErrorBoundary>
    )
    component = (
      //<React.Fragment>{reviewMode ? reviewView : textArea}</React.Fragment>
      <React.Fragment>{textArea}</React.Fragment>
    )
  }

  return (
    <div
      id="writing-surface"
      css={css`
        background-color: white;
        width: 100%;
        box-shadow: 0px 4px 4px 0px #00000040;
        border: 1px solid #c6c6c6;
        flex: 1 1 auto;
        overflow: auto;
      `}
    >
      {component}
    </div>
  )
}
