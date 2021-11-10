import React from 'react';

export interface Remote {
    url: string
}

type RemotesProps = {
  onFetchUrl: (url: string) => Promise<void>,
  onPushToUrl: (url: string) => Promise<void>,
}


export function Remotes({onFetchUrl, onPushToUrl}: RemotesProps){
    const [remotes, setRemotes] = React.useState<Remote[]>([])

    const addRemote = (url: string) => {
      const newRemotes = Array.from(remotes)
      newRemotes.push({url})
      setRemotes(newRemotes)
    }

    const [newRemoteUrl, setNewRemoteUrl] = React.useState('');
    const onNewRemoteUrl_enter = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key == 'Enter' && newRemoteUrl.length > 0) {
        addRemote(newRemoteUrl)
        setNewRemoteUrl('')
      }
    }

    const onClickNewRemote = () => {
        if (newRemoteUrl.length > 0) {
            addRemote(newRemoteUrl)
            setNewRemoteUrl('')
        }
    }
    return (<div className="remotes">
        <h1>Remotes</h1>
        <div className="new-remote">
            <input
              className="new-remote-input"
              placeholder="Remote URL"
              autoFocus
              onKeyPress={onNewRemoteUrl_enter}
              onChange={e => setNewRemoteUrl(e.target.value)}
              value={newRemoteUrl}
            />
            <button onClick={onClickNewRemote}>Add</button>
        </div>
        {remotes.map(r => <Remote key={r.url} remote={r} onFetchPressed={onFetchUrl} onPushPressed={onPushToUrl} />)}
    </div>)
}

type RemoteProps = {
  remote: Remote,
  onFetchPressed: (url: string) => Promise<void>,
  onPushPressed: (url: string) => Promise<void>,
}

export function Remote({remote, onFetchPressed, onPushPressed}: RemoteProps){
  return (<div className="remote">
    <div className="remote-url">
        <p>URL:</p>
        <div className="url-container">
            <p className="url">{remote.url}</p>
        </div>
    </div>
    <div className="remote-controls">
      <button onClick={() => onFetchPressed(remote.url)}>Fetch</button>
      <button onClick={() => onPushPressed(remote.url)}>Push</button>
    </div>
  </div>)
}
