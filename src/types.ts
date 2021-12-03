import * as Automerge from 'automerge';

export type Feature = {
  id: string,
  lat: number,
  lng: number,
  description?: Automerge.Text | string
}

export type Tag = string;
export type Attachment = string;

export type Binding = any;

export type AppState = {
  parent: string,
  id: string,
  features: Feature[]
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

export type Document = {
  id: string,
  meta: {
    parent: string,
    title: string
  }
}