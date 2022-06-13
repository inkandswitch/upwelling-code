import React, { useState, useCallback, useEffect } from 'react'
import { Redirect, Route } from 'wouter'
import Documents from './Documents'
import WithDocument from './components/withDocument'
import { useDropzone } from 'react-dropzone'
import NoDocument from './components/NoDocument'
import { useLocation } from 'wouter'
import { Button } from './components/Button'
import { nanoid } from 'nanoid'

let documents = Documents()

require('setimmediate')

export default function App() {
  let [ids, setIds] = useState<string[]>([])
  let [, setLocation] = useLocation()

  useEffect(() => {
    async function main() {
      let ids = await documents.storage.ids()
      setIds(ids)
    }
    main()
  }, [])

  const onDrop = useCallback(
    (acceptedFiles) => {
      const reader = new FileReader()

      reader.onabort = () => console.log('file reading was aborted')
      reader.onerror = () => console.log('file reading has failed')
      reader.onload = async () => {
        // Do whatever you want with the file contents
        const binaryStr = reader.result
        if (binaryStr) {
          let buf = Buffer.from(binaryStr)
          let upwell = await documents.toUpwell(buf)
          await documents.storage.setItem(upwell.id, buf)
          setLocation('/' + upwell.id + '/stack')
        }
      }
      reader.readAsArrayBuffer(acceptedFiles[0])
    },
    [setLocation]
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    noClick: true,
    onDrop,
  })

  async function newUpwell() {
    let id = nanoid()
    let doc = await documents.create(id, documents.author)
    documents.sync(id).finally(() => {
      setLocation('/' + doc.id + '/stack')
    })
  }

  return (
    <>
      <Route path="/:id/:did">
        {(params) => {
          let props = {
            author: documents.author,
            ...params,
          }

          return <WithDocument {...props} />
        }}
      </Route>
      <Route path="/">
        {(params) => {
          return (
            <div {...getRootProps()}>
              <NoDocument>
                <input {...getInputProps()} />
                {isDragActive ? (
                  <p>Drop the files here ...</p>
                ) : (
                  <p>Drag 'n' drop some files here, or click to select files</p>
                )}
                <div>
                  Recently opened documents
                  <ul>
                    {ids.map((id: string) => {
                      return (
                        <li>
                          <a href={`/${id}/stack`}>{id}</a>
                        </li>
                      )
                    })}
                  </ul>
                </div>
                <Button onClick={newUpwell}>New Document</Button>
              </NoDocument>
            </div>
          )
        }}
      </Route>
      <Route path="/new">
        {() => {
          newUpwell()
          return null
        }}
      </Route>
      <Route path="/:id">
        <Redirect to="/" />
      </Route>
      <Route>
        <Redirect to="/" />
      </Route>
    </>
  )
}
