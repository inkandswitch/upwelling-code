import React, { FormEventHandler, useState } from 'react';
import Documents  from '../documents'
import { useLocation } from 'wouter';

let documents = Documents()

export default function NewDocument() {
  const [, setLocation] = useLocation();
  let [title, setTitle] = useState('')

  let createNew: FormEventHandler<HTMLFormElement> = (e: React.FormEvent) =>{
    e.preventDefault()
    let document = documents.create(title)
    setLocation(`/doc/${document.id}`)
  }

  return <div> 
    <form onSubmit={createNew}>
      <input type="text" placeholder="Title of your document" value={title} onChange={(e) => setTitle(e.target.value)}/>
      <button type="submit">Create new Document</button>
    </form>
  </div>

}