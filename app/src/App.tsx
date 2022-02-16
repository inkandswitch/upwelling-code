import React, { useEffect, useState } from "react";
import DocumentView from "./components/DocumentView";
import { Upwell } from "api";
import { Route, useLocation } from "wouter";
import * as fs from './storage/localStorage'
import catnames from "cat-names";

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
    let upwell = await Upwell.create({ fs, author })
    let meta = await (upwell.metadata())
    setLocation('/document/' + meta.main)
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
