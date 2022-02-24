export default interface SyncStorage {
  setItem: (id: string, binary: Uint8Array) => void,
  getItem: (id: string) => Uint8Array | null | undefined,
  ids: () => string[]
}
