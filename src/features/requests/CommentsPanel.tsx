import { useEffect, useRef, useState } from 'react'
import { format } from 'date-fns'
import { useComments } from './useComments'

function formatBRT(iso: string): string {
  const d = new Date(iso)
  const brt = new Date(d.getTime() - 3 * 60 * 60 * 1000)
  return format(brt, 'dd/MM HH:mm')
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
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  // Auto-scroll whenever comments change
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
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Contact buttons (T14.16) */}
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

      {/* Timeline */}
      <div className="max-h-64 overflow-y-auto flex flex-col gap-2 pr-1">
        {loading && comments.length === 0 && (
          <p className="text-zinc-600 text-xs">Carregando comentários…</p>
        )}
        {!loading && comments.length === 0 && (
          <p className="text-zinc-600 text-xs">Nenhum comentário ainda.</p>
        )}
        {comments.map((c) => (
          <div key={c.id} className="flex gap-2 items-start">
            <div className="shrink-0 w-7 h-7 rounded-full bg-pink-950 flex items-center justify-center">
              <span className="text-pink-400 text-[10px] font-bold">{initials(c.author_name)}</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-1.5 flex-wrap">
                <span className="text-zinc-200 text-xs font-semibold">{c.author_name}</span>
                <span className="text-zinc-600 text-[10px]">{formatBRT(c.created_at)}</span>
              </div>
              <p className="text-zinc-300 text-xs mt-0.5 break-words">{c.content}</p>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex gap-2 items-end">
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
