import React, {forwardRef, useEffect, useImperativeHandle, useRef, useState} from 'react';
import { createEditor, initializeDocs } from "./bridge"
import { Publisher } from "./pubsub"
import type { Change } from "./micromerge"
import type { Editor } from "./bridge"
import { Mark } from "prosemirror-model"
import Micromerge from "./micromerge"
import {
    EditorView,
} from 'prosemirror-view';

export interface Handle {
    view: EditorView | null;
}

type Props = any

const publisher = new Publisher<Array<Change>>()
const actorId = "alice"
const aliceDoc = new Micromerge(actorId)

initializeDocs(
    [aliceDoc],
    [
        {
            path: [Micromerge.contentKey],
            action: "insert",
            index: 0,
            values: "This is the Peritext editor demo. Press sync to synchronize the editors. Ctrl-B for bold, Ctrl-i for italic, Ctrl-k for link, Ctrl-e for comment".split(
                "",
            ),
        },
    ]
)

export default forwardRef<Handle, Props>(function ProseMirror(
    props,
    ref,
): JSX.Element {
    let [editor, setEditor] = useState(null)
    let [marks, setMarks] = useState('')
    const root = useRef<HTMLDivElement>(null)
    const changesRef = useRef<HTMLDivElement>(null);
    const viewRef = useRef<EditorView<any> | null>(null);

    useEffect(() => {
        let { doc, view, queue } = createEditor({
            actorId,
            editorNode: root.current,
            changesNode: changesRef.current,
            doc: aliceDoc,
            publisher,
            editable: true,
            onChange: (change) => {
                props.onChange(doc)
            },
            onRemotePatchApplied: () => {
                console.log('boop')
            }
        })

        setEditor(editor)
        viewRef.current = view
        return () => {
            view.destroy()
        }
    }, [])
    useImperativeHandle(ref, () => ({
        get view() {
            return viewRef.current;
        },
    }));
 
    return <div>
        <div className="editors-container">
            <div className="editor-container" id="alice">
                <h3>Editor</h3>
                <div ref={root} className="editor"></div>
                <div className="changes-container">
                    <h3>Micromerge Operations + Prosemirror Steps</h3>
                    <div ref={changesRef} className="changes"></div>
                </div>
            </div>
        </div>
    </div>
});

