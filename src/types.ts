import { Shape } from './shapes'

export type Binding = any;

export type AppState = {
  id: string,
  shapes: Record<string, Shape>
  bindings: Record<string, Binding> 
}

export type AppProps = {
  id: string
}

export enum SYNC_STATE {
  SYNCED = 0,
  LOADING = 1,
  ERROR = 2,
  OFFLINE = 3
}