export default interface AsyncStorage {
  setItem: (id: string, binary: Uint8Array) => Promise<void>,
  getItem: (id: string) => Promise<Uint8Array | null | undefined>,
  ids: () => Promise<string[]>
}
