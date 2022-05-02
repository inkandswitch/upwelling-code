/** @jsxImportSource @emotion/react */
import { css } from '@emotion/react/macro'
import React from 'react'
import { ErrorBoundary } from 'react-error-boundary'
import { Editor } from './Editor'
import Documents from '../Documents'

let documents = Documents()

// visible 0 or more drafts NOT including root
// root

type Props = {
  id: string
  editable: boolean
  visible: string
  historyHeads: string[] | false
  onClick: React.MouseEventHandler<HTMLDivElement>
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
  const { id, editable, historyHeads, visible, onClick } = props
  //  let [text, setText] = useState<string | undefined>()
  let upwell = documents.get(id)

  let backTheBackUp = async () => {
    let draft = upwell.get(props.visible)
    let changes = draft.doc.getChanges([])
    let oldIsNewAgain = upwell.createDraft(`${draft.message} (recovered)`)
    oldIsNewAgain.doc.applyChanges(changes.slice(0, changes.length - 1))
    await documents.save(id)
    window.location.href = `/${id}/${oldIsNewAgain.id}`
  }

  let textArea = (
    <ErrorBoundary FallbackComponent={ErrorFallback} onReset={backTheBackUp}>
      <Editor
        upwellId={upwell.id}
        editable={editable}
        historyHeads={historyHeads}
        editableDraftId={visible}
      ></Editor>
    </ErrorBoundary>
  )

  let component = (
    //<React.Fragment>{reviewMode ? reviewView : textArea}</React.Fragment>
    <React.Fragment>{textArea}</React.Fragment>
  )

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
      onClick={onClick}
    >
      {component}
    </div>
  )
}
