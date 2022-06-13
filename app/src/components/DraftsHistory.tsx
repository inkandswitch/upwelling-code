/** @jsxImportSource @emotion/react */
import { useEffect } from 'react'
import FormControl from '@mui/material/FormControl'
import { DraftMetadata, Author, Upwell } from 'api'
import { useState } from 'react'
import Documents from '../Documents'
import { DetailedOption, HistorySelect } from './Select'
import { AuthorColorsType } from './ClickableDraftList'
import { ReactComponent as OffsetPancakes } from '../components/icons/OffsetPancakes.svg'
import { ReactComponent as PancakeSmall } from '../components/icons/PancakeSmall.svg'

let documents = Documents()

const HISTORY_FETCH_SIZE = 5

type Props = {
  drafts: DraftMetadata[]
  id: string
  did: string
  goToDraft: Function
  setHistorySelection: (draft: DraftMetadata) => void
  colors?: AuthorColorsType
  author: Author
}
export default function DraftsHistory({ id, did, setHistorySelection }: Props) {
  const upwell = documents.get(id)
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
  }, [id, fetchSize])

  // function onGetMoreClick() {
  //   setFetchSize(fetchSize + HISTORY_FETCH_SIZE)
  // }

  function renderValue() {
    return ''
  }

  return (
    <FormControl>
      <HistorySelect
        value={history.find((d) => d.id === did)}
        onChange={(value: DraftMetadata | null) => {
          if (value === null) return
          setHistorySelection(value)
        }}
        renderValue={renderValue}
      >
        {did !== upwell.rootDraft.id && (
          <DetailedOption
            key={'stack'}
            option={{
              ...upwell.rootDraft.materialize(),
              message: upwell.get(did).message,
            }}
            upwell={upwell}
            icon={PancakeSmall}
          />
        )}
        {history
          .filter((d) => d.message !== Upwell.SPECIAL_ROOT_DOCUMENT)
          .map((d) => {
            return (
              <DetailedOption
                key={d.id + '-' + d.authorId + '-' + d.message}
                option={d}
                upwell={upwell}
                icon={OffsetPancakes}
              />
            )
          })}
      </HistorySelect>
    </FormControl>
  )
}
