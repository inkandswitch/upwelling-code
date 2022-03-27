import { Author, Documents, createAuthorId } from 'api'
import catNames from 'cat-names'

var documents: Documents

export function initialize(author: Author): Documents {
  if (documents) return documents
  documents = new Documents({
    id: author.id,
    name: author.name,
  })
  return documents
}

export default function main() {
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
  return initialize(author as Author)
}
