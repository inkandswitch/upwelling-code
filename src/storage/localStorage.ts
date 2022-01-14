export const getItem = (id: string): string | null => {
  return localStorage.getItem(id)
}

export const setItem = (id: string, value: string): void => {
  localStorage.setItem(id, value) 
}

export const ids = (): string[] => {
  return Object.keys(localStorage)
}