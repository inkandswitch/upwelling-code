import React from 'react'
import DocumentView from './components/DocumentView'
import ListDocuments from './components/ListDocuments'
import NewDocument from './components/NewDocument'
import { Route, useLocation } from "wouter";
import Documents from './documents/'

let documents = Documents()

export default function App() {
  const [, setLocation] = useLocation();
  return <div>
    <Route path="/doc/:id">
      {(params) => {
        let document = documents.load(params.id)
        if (document) {
          return <DocumentView doc={document} />
        } else {
          setLocation("/");
        }
      }}
    </Route>
    <Route path="/" component={ListDocuments}>  </Route>
    <Route path="/new" component={NewDocument}>  </Route>
  </div>
}
