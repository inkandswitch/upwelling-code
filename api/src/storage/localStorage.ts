import { Buffer } from 'buffer'

export default class PrefixedLocalStorage {
  prefix: string
  constructor(prefix: string) {
    this.prefix = prefix
  }

  getItem(id: string): Buffer | undefined | null {
    let payload = localStorage.getItem(`${this.prefix}.${id}`)
    if (!payload) return null
    return Buffer.from(payload, 'base64')
  }

  setItem(id: string, value: Uint8Array): void {
    return localStorage.setItem(
      `${this.prefix}.${id}`,
      Buffer.from(value).toString('base64')
    )
  }

  ids(): string[] {
    return Object.keys(localStorage)
      .filter((id) => {
        let maybePrefix = id.split('.')
        return maybePrefix.length && maybePrefix[0] === this.prefix
      })
      .map((id) => id.split('.')[1])
  }
}
