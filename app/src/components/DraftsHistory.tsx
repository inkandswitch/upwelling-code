/** @jsxImportSource @emotion/react */
import { useEffect } from 'react'
import FormControl from '@mui/material/FormControl'
import { DraftMetadata, Author } from 'api'
import { useState } from 'react'
import Documents from '../Documents'
import Select, { DetailedOption } from './Select'
import { getYourDrafts } from '../util'
import { AuthorColorsType } from './ClickableDraftList'

let documents = Documents()

const HISTORY_FETCH_SIZE = 5

type Props = {
  drafts: DraftMetadata[]
  epoch: number
  id: string
  did: string
  goToDraft: Function
  setHistorySelection: (id: string) => void
  colors?: AuthorColorsType
  author: Author
}
export default function DraftsHistory({
  epoch,
  drafts,
  id,
  did,
  goToDraft,
  setHistorySelection,
  colors = {},
  author,
}: Props) {
  const upwell = documents.get(id)
  const authors = upwell.metadata.getAuthors()
  let [history, setHistory] = useState<DraftMetadata[]>([])
  let [, setNoMoreHistory] = useState<boolean>(false)
  let [fetchSize] = useState<number>(HISTORY_FETCH_SIZE)

  useEffect(() => {
    let upwell = documents.get(id)
    const moreHistory: DraftMetadata[] = []
    for (let i = 0; i < fetchSize; i++) {
      let value = upwell.history.get(i)
      if (value) moreHistory.push(value)
    }
    setNoMoreHistory(upwell.history.length <= fetchSize)
    setHistory(moreHistory)
  }, [id, fetchSize, epoch])

  // function onGetMoreClick() {
  //   setFetchSize(fetchSize + HISTORY_FETCH_SIZE)
  // }

  // Hack because the params are always undefined?
  function renderValue() {
    return 'intentionally left blank'
  }

  return (
    <FormControl>
      <Select
        value={history.find((d) => d.id === did)}
        onChange={(value: DraftMetadata | null) => {
          if (value === null) {
            console.log('draft is null')
            return
          }
          goToDraft(value.id)
        }}
        renderValue={renderValue}
      >
        {getYourDrafts(history, upwell.rootDraft.id, author.id).map((d) => (
          <DetailedOption option={d} authors={authors} />
        ))}
      </Select>
    </FormControl>
  )
}
