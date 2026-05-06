import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { io } from 'socket.io-client'
import type { Socket } from 'socket.io-client'
import './App.css'

type ChatMessage = {
  id: string
  message: string
  username: string
  timeStamp: string
  temporary?: boolean
  duration?: number
  remaining?: number
}

const SERVER_URL = 'http://localhost:5000'

function App() {
  const socket = useMemo<Socket>(() => io(SERVER_URL, { autoConnect: false }), [])
  const [username, setUsername] = useState('')
  const [draftUsername, setDraftUsername] = useState('')
  const [message, setMessage] = useState('')
  const [duration, setDuration] = useState(10)
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

    socket.on(
      'temp_message',
      (data: {
        message_id: string
        message: string
        username: string
        timeStamp: string
        duration: number
      }) => {
        setMessages((current) => [
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
        ])
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

    socket.emit('set_username', { username: cleanUsername })
    setUsername(cleanUsername)
  }

  function sendMessage() {
    const cleanMessage = message.trim()
    if (!cleanMessage || !username) return

    const payload = {
      message: cleanMessage,
      messageId: crypto.randomUUID(),
      timeStamp: new Date().toLocaleTimeString(),
      duration,
    }

    socket.emit('temp_message', payload)
    setMessage('')
  }

  return (
    <main className="chat-shell">
      <aside className="sidebar">
        <div>
          <p className="eyebrow">{status}</p>
          <h1>Tempral Chat</h1>
        </div>

        <form className="username-form" onSubmit={handleUsernameSubmit}>
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
        </form>

        <section>
          <h2>Conectados</h2>
          <ul className="user-list">
            {users.map((user, index) => (
              <li key={`${user}-${index}`}>{user}</li>
            ))}
            {users.length === 0 && <li>Aun no hay usuarios</li>}
          </ul>
        </section>
      </aside>

      <section className="chat-panel">
        <div className="messages">
          {messages.map((item) => (
            <article
              className={item.username === username ? 'message mine' : 'message'}
              key={item.id}
            >
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
                  <span>Duracion: {item.duration}s</span>
                )}
              </div>
            </article>
          ))}
          {messages.length === 0 && (
            <p className="empty-state">Escribe el primer mensaje.</p>
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
          <label>
            Segundos
            <input
              min="3"
              max="60"
              type="number"
              value={duration}
              onChange={(event) => setDuration(Number(event.target.value))}
            />
          </label>
          <button type="submit" disabled={!username}>
            Enviar
          </button>
        </form>
      </section>
    </main>
  )
}

export default App
