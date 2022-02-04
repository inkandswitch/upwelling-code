import { Buffer }  from 'buffer'

export const getItem = async (id: string): Promise<Uint8Array | undefined | null> => {
  let payload = localStorage.getItem(id)
  if (!payload) return null
  return Uint8Array.from(Buffer.from(payload, 'base64'))
}

export const setItem = async (id: string, value: Uint8Array): Promise<void> => {
  return localStorage.setItem(id, Buffer.from(value).toString('base64')) 
}

export const ids = async (): Promise<string[]> => {
  return Object.keys(localStorage)
}