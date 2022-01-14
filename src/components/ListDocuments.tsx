import React from 'react'
import Documents, { UpwellingDocMetadata }  from '../documents'

let documents = Documents()

export default function ListDocuments() {
  return <div>
    <ul>
      {documents.list().map((value: UpwellingDocMetadata) => {
        return <li><a href={`/doc/${value.id}`}>{value.title}</a></li>
      })}
    </ul>
  </div>
}