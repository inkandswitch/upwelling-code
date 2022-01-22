import React, { useState, useEffect } from 'react'
import Documents, { UpwellingDocMetadata }  from '../documents'

let documents = Documents()

type Props = {
  list: UpwellingDocMetadata[]
}

export default function MaybeListDocuments() {
  let [list, setList] = useState<UpwellingDocMetadata[]>([])
  useEffect(() => {
    documents.list().then(value => {
      setList(value)
    })
  }, [])
  return <ListDocuments list={list} />
}

export function ListDocuments({ list }: Props) {
  return <div>
    <ul>
      {list.map((value: UpwellingDocMetadata) => {
        return <li><a href={`/doc/${value.id}`}>{value.title}</a></li>
      })}
    </ul>
  </div>
}