import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { io } from 'socket.io-client'
import type { Socket } from 'socket.io-client'
import './App.css'

type ChatMessage = {
  id: string
  message: string
  username?: string
  timeStamp: string
  temporary?: boolean
  duration?: number
  remaining?: number
  system?: boolean
}

const SERVER_URL = 'http://localhost:5000'

function App() {
  const socket = useMemo<Socket>(() => io(SERVER_URL, { autoConnect: false }), [])
  const [username, setUsername] = useState('')
  const [draftUsername, setDraftUsername] = useState('')
  const [message, setMessage] = useState('')
  const [users, setUsers] = useState<string[]>([])
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [status, setStatus] = useState('Desconectado')

  useEffect(() => {
    socket.connect()

    socket.on('connect', () => setStatus('Conectado'))
    socket.on('disconnect', () => setStatus('Desconectado'))

    socket.on('user_list', ({ users }: { users: string[] }) => {
      setUsers(users)
    })

    socket.on('user_joined', ({ username }: { username: string }) => {
      setMessages((current) => [
        ...current,
        {
          id: `joined-${username}-${Date.now()}`,
          message: `${username} entro al chat`,
          timeStamp: new Date().toLocaleTimeString(),
          system: true,
        },
      ])
    })

    socket.on('user_left', ({ username }: { username: string }) => {
      setMessages((current) => [
        ...current,
        {
          id: `left-${username}-${Date.now()}`,
          message: `${username} salio del chat`,
          timeStamp: new Date().toLocaleTimeString(),
          system: true,
        },
      ])
    })

    socket.on(
      'temp_message',
      (data: {
        message_id: string
        message: string
        username: string
        timeStamp: string
        duration: number
      }) => {
        setMessages((current) => {
          if (current.some((item) => item.id === data.message_id)) {
            return current
          }

          return [
            ...current,
            {
              id: data.message_id,
              message: data.message,
              username: data.username,
              timeStamp: data.timeStamp,
              temporary: true,
              duration: data.duration,
              remaining: data.duration,
            },
          ]
        })
      },
    )

    socket.on(
      'temp_message_countdown',
      ({ messageId, remaining }: { messageId: string; remaining: number }) => {
        setMessages((current) =>
          current.map((item) =>
            item.id === messageId ? { ...item, remaining } : item,
          ),
        )
      },
    )

    socket.on('temp_message_deleted', ({ messageId }: { messageId: string }) => {
      setMessages((current) => current.filter((item) => item.id !== messageId))
    })

    return () => {
      socket.removeAllListeners()
      socket.disconnect()
    }
  }, [socket])

  function handleUsernameSubmit(event: FormEvent) {
    event.preventDefault()
    const cleanUsername = draftUsername.trim()
    if (!cleanUsername) return

    setUsername(cleanUsername)
    socket.emit('set_username', { username: cleanUsername })
  }

  function sendMessage() {
    const cleanMessage = message.trim()
    if (!cleanMessage || !username) return

    const payload = {
      message: cleanMessage,
      messageId: crypto.randomUUID(),
      timeStamp: new Date().toLocaleTimeString(),
    }

    socket.emit('temp_message', payload)
    setMessage('')
  }

  return (
    <main className="chat-shell">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">T</span>
          <div>
            <p className="eyebrow">Mensajes efimeros</p>
            <h1>Tempral Chat</h1>
          </div>
        </div>
        <span className={`status-pill ${status === 'Conectado' ? 'online' : ''}`}>
          {status}
        </span>
      </header>

      <div className="workspace">
        <aside className="sidebar">
          <form className="session-card" onSubmit={handleUsernameSubmit}>
            <label htmlFor="username">Usuario</label>
            <div className="inline-form">
              <input
                id="username"
                value={draftUsername}
                onChange={(event) => setDraftUsername(event.target.value)}
                placeholder="Tu nombre"
              />
              <button type="submit">Entrar</button>
            </div>
            {username && <p className="signed-in">Activo como {username}</p>}
          </form>

          <section className="side-section">
            <div className="section-heading">
              <h2>Conectados</h2>
              <span>{users.length}</span>
            </div>
            <ul className="user-list">
              {users.map((user, index) => (
                <li key={`${user}-${index}`}>{user}</li>
              ))}
              {users.length === 0 && <li>Aun no hay usuarios</li>}
            </ul>
          </section>

          <div className="doodle-card" aria-hidden="true">
            <div className="doodle-clock">
              <span></span>
            </div>
            <div className="doodle-lines">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        </aside>

        <section className="chat-panel">
          <div className="messages">
            {messages.map((item) => (
              <article
                className={[
                  'message',
                  item.username === username ? 'mine' : '',
                  item.system ? 'system-message' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                key={item.id}
              >
                {item.system ? (
                  <p>{item.message}</p>
                ) : (
                  <>
                    <div className="message-meta">
                      <strong>{item.username}</strong>
                      <span>{item.timeStamp}</span>
                    </div>
                    <p>{item.message}</p>
                    <div className="message-actions">
                      <span>
                        Temporal
                        {typeof item.remaining === 'number'
                          ? ` - ${item.remaining}s`
                          : ''}
                      </span>
                      {typeof item.duration === 'number' && (
                        <span>Limite: {item.duration}s</span>
                      )}
                    </div>
                  </>
                )}
              </article>
            ))}
            {messages.length === 0 && (
              <div className="empty-state">
                <p>Escribe el primer mensaje.</p>
              </div>
            )}
          </div>

          <form
            className="composer"
            onSubmit={(event) => {
              event.preventDefault()
              sendMessage()
            }}
          >
            <input
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder={username ? 'Escribe un mensaje' : 'Primero entra con usuario'}
              disabled={!username}
            />
            <button type="submit" disabled={!username}>
              Enviar
            </button>
          </form>
        </section>
      </div>
    </main>
  )
}

export default App
