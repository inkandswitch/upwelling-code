import { Buffer } from 'buffer'
import localforage from 'localforage'

export default class PrefixedLocalStorage {
  prefix: string
  constructor(prefix: string) {
    this.prefix = prefix
  }

  async getItem(id: string): Promise<Buffer | undefined | null> {
    let payload = await localforage.getItem(`${this.prefix}.${id}`) as string
    if (!payload) return null
    return Buffer.from(payload, 'base64')
  }

  async setItem(id: string, value: Buffer): Promise<string> {
    return await localforage.setItem(
      `${this.prefix}.${id}`,
      Buffer.from(value).toString('base64')
    )
  }

  async ids(): Promise<string[]> {
    return (await localforage.keys())
      .filter((id: string) => {
        let maybePrefix = id.split('.')
        return maybePrefix.length && maybePrefix[0] === this.prefix
      })
      .map((id: string) => id.split('.')[1])
  }
}
