import { AuthorId } from './Upwell'
import { Collection } from './Collection'
import { nanoid } from 'nanoid'

export type CommentId = string
export enum CommentState {
  OPEN,
  CLOSED,
  CHILD,
}

export type Comment = {
  id: CommentId
  author: AuthorId
  message: string
  children: string[]
  parentId?: CommentId
  state: CommentState
}

export class Comments extends Collection<Comment> {
  resolve(comment: Comment) {
    this.doc.put(`/${this.name}/${comment.id}/`, 'state', CommentState.CLOSED)
  }

  addChild(message: string, author: AuthorId, parentId: CommentId): Comment {
    const id = nanoid()
    const child = {
      id,
      author,
      message,
      children: [],
      parentId,
      state: CommentState.OPEN,
    }
    this.insert(child)
    let path = `/${this.name}/${child.parentId}/children`
    let len = this.doc.length(path)
    this.doc.insert(path, len, child.id)
    return child
  }
}
