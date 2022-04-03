import { Documents, createAuthorId } from 'api'
import catNames from 'cat-names'

const STORAGE_URL = process.env.STORAGE_URL
var documents: Documents
console.log(STORAGE_URL)

export default function initialize(): Documents {
  if (documents) return documents
  let author = {
    id: localStorage.getItem('authorId'),
    name: localStorage.getItem('authorName'),
  }
  if (!author.id) {
    author.id = createAuthorId()
    localStorage.setItem('authorId', author.id)
  }
  if (!author.name) {
    author.name = catNames.random()
    localStorage.setItem('authorName', author.name)
  }
  documents = new Documents(
    {
      id: author.id,
      name: author.name,
    },
    STORAGE_URL!
  )
  return documents
}
