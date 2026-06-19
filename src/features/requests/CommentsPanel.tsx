import { useEffect, useRef, useState } from 'react'
import { format } from 'date-fns'
import { useComments } from './useComments'
import { useAuth } from '../auth/useAuth'
import { buildWhatsAppUrl } from '../../shared/utils/whatsapp'

function formatBRT(iso: string): string {
  const d = new Date(iso)
  const brt = new Date(d.getTime() - 3 * 60 * 60 * 1000)
  return format(brt, 'HH:mm')
}

function WhatsAppIcon() {
  return (
    <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  )
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
              href={buildWhatsAppUrl(contact.pilotPhone, contact.pilotName ? `Olá ${contact.pilotName}, ` : '')}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#25D366]/30 bg-[#25D366]/10 px-3 py-1.5 text-xs text-[#25D366] hover:bg-[#25D366]/20 transition-colors"
            >
              <WhatsAppIcon />
              <span>Piloto</span>
              {contact.pilotName && <span className="text-[#25D366]/60">· {contact.pilotName}</span>}
            </a>
          )}
          {contact.leaderPhone && (
            <a
              href={buildWhatsAppUrl(contact.leaderPhone, contact.leaderName ? `Olá ${contact.leaderName}, ` : '')}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#25D366]/30 bg-[#25D366]/10 px-3 py-1.5 text-xs text-[#25D366] hover:bg-[#25D366]/20 transition-colors"
            >
              <WhatsAppIcon />
              <span>Líder</span>
              {contact.leaderName && <span className="text-[#25D366]/60">· {contact.leaderName}</span>}
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
