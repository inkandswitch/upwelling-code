import React, { useEffect, useState } from "react";
import DocumentView from "./components/DocumentView";
import { Route, useLocation } from "wouter";
import Documents from './Documents'
import catnames from "cat-names";
require("setimmediate"); 

let documents = Documents()

export default function App() {
  let [author, setAuthor] = useState<string>("");
  let [, setLocation] = useLocation()

  useEffect(() => {
    let localName = localStorage.getItem("name");
    if (!localName || localName === "?") localName = catnames.random();
    if (localName && author !== localName) {
      localStorage.setItem("name", localName);
    }
    setAuthor(localName);
  }, [author]);

  async function newUpwell() {
    let doc = await documents.create()
    setLocation('/document/' + doc.id)
  }

  return (
    <>
      {/* <div id="topbar">
      My name is {author}
    </div> */}
      <Route path="/document/:id">
        {(params) => <DocumentView author={author} id={params.id} />}
      </Route>
      <Route path="/">
        {() => {
          return <div><button onClick={newUpwell}>New Document</button></div>
        }}
      </Route>
    </>
  );
}
