export type Binding = any;

export enum SYNC_STATE {
  SYNCED = 0,
  LOADING = 1,
  ERROR = 2,
  OFFLINE = 3,
  PREVIEW = 4
}

export type ListItem = {
  id: string,
  meta: {
    parent: string,
    title: string
  }
}