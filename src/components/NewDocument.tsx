import React, { useState } from 'react';
import Documents  from '../documents'
import { useLocation } from 'wouter';

let documents = Documents()

export default function NewDocument() {
  const [, setLocation] = useLocation();
  let [title, setTitle] = useState('')

  function createNew() {
    let document = documents.create(title)
    setLocation(`/doc/${document.id}`)
  }

  return <div> 
    <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}/>
    <button onClick={createNew}>New</button>
  </div>

}