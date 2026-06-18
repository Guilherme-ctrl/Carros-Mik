import { useEffect, useRef, useState } from 'react'
import { format } from 'date-fns'
import { useComments } from './useComments'
import { useAuth } from '../auth/useAuth'

function formatBRT(iso: string): string {
  const d = new Date(iso)
  const brt = new Date(d.getTime() - 3 * 60 * 60 * 1000)
  return format(brt, 'HH:mm')
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0][0].toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

interface ContactInfo {
  pilotName?: string | null
  pilotPhone?: string | null
  leaderName?: string | null
  leaderPhone?: string | null
}

interface Props {
  requestId: string
  contact?: ContactInfo
}

export function CommentsPanel({ requestId, contact }: Props) {
  const { comments, loading, addComment } = useComments(requestId)
  const user = useAuth((s) => s.user)
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [comments])

  async function handleSend() {
    const trimmed = text.trim()
    if (!trimmed || sending) return
    setSending(true)
    setText('')
    try {
      await addComment(trimmed)
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Contact buttons */}
      {(contact?.pilotPhone || contact?.leaderPhone) && (
        <div className="flex gap-2 flex-wrap">
          {contact.pilotPhone && (
            <a
              href={`tel:${contact.pilotPhone}`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 hover:border-zinc-500 hover:text-zinc-100 transition-colors"
            >
              <span>📞</span>
              <span>Ligar para Piloto</span>
              {contact.pilotName && <span className="text-zinc-500">· {contact.pilotName}</span>}
            </a>
          )}
          {contact.leaderPhone && (
            <a
              href={`tel:${contact.leaderPhone}`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 hover:border-zinc-500 hover:text-zinc-100 transition-colors"
            >
              <span>📞</span>
              <span>Ligar para Líder</span>
              {contact.leaderName && <span className="text-zinc-500">· {contact.leaderName}</span>}
            </a>
          )}
        </div>
      )}

      {/* Message list */}
      <div className="max-h-64 overflow-y-auto flex flex-col gap-1.5 pr-1">
        {loading && comments.length === 0 && (
          <p className="text-zinc-600 text-xs">Carregando comentários…</p>
        )}
        {!loading && comments.length === 0 && (
          <p className="text-zinc-600 text-xs">Nenhum comentário ainda.</p>
        )}
        {comments.map((c, i) => {
          const isOwn = c.author_id === user?.id
          const showAuthor = !isOwn && (i === 0 || comments[i - 1].author_id !== c.author_id)
          return (
            <div key={c.id} className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
              {showAuthor && (
                <div className="flex items-center gap-1 mb-0.5 ml-1">
                  <div className="w-4 h-4 rounded-full bg-pink-950 flex items-center justify-center shrink-0">
                    <span className="text-pink-400 text-[8px] font-bold">{initials(c.author_name)}</span>
                  </div>
                  <span className="text-pink-400 text-[10px] font-semibold">{c.author_name}</span>
                </div>
              )}
              <div
                className={[
                  'max-w-[80%] px-3 py-1.5 text-xs text-zinc-100 break-words',
                  isOwn
                    ? 'bg-pink-950 border border-pink-800/40 rounded-tl-xl rounded-bl-xl rounded-tr-sm rounded-br-xl'
                    : 'bg-zinc-800 border border-zinc-700 rounded-tr-xl rounded-br-xl rounded-tl-sm rounded-bl-xl',
                ].join(' ')}
              >
                <p className="leading-relaxed">{c.content}</p>
                <p className={`text-[10px] mt-0.5 ${isOwn ? 'text-pink-400/60 text-right' : 'text-zinc-500'}`}>
                  {formatBRT(c.created_at)}
                </p>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input — sticky so it stays visible when the sidebar is scrolled */}
      <div className="sticky bottom-0 bg-zinc-950 pt-1 flex gap-2 items-end">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              handleSend()
            }
          }}
          disabled={sending}
          placeholder="Adicionar comentário…"
          rows={2}
          className="flex-1 resize-none rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-pink-600 focus:border-transparent disabled:opacity-50"
        />
        <button
          onClick={handleSend}
          disabled={sending || !text.trim()}
          className="h-9 px-3 rounded-lg bg-pink-700 text-white text-xs font-semibold hover:bg-pink-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
        >
          {sending ? '…' : 'Enviar'}
        </button>
      </div>
    </div>
  )
}
