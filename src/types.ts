import * as Automerge from 'automerge';

export type Binding = any;

export type AppState = {
  parent: string,
  title: Automerge.Text,
  id: string,
  text: Automerge.Text
}

export type AppProps = {
  id: string
}

export enum SYNC_STATE {
  SYNCED = 0,
  LOADING = 1,
  ERROR = 2,
  OFFLINE = 3,
  PREVIEW = 4
}