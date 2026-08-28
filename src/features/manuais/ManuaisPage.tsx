import { Link } from 'react-router-dom'

interface Doc {
  titulo: string
  para: string
  descricao: string
  html: string
  pdf: string
  cor: string
}

// Os arquivos vivem em public/manuais/ e são servidos estáticos: nada de
// autenticação no caminho deles. É deliberado — o folder de instalação é
// justamente o que a pessoa precisa ANTES de conseguir entrar no sistema.
const DOCS: Doc[] = [
  {
    titulo: 'Instale o app',
    para: 'Motorista',
    descricao:
      'Passo a passo para iPhone e Android, com o QR Code da instalação e o que fazer quando o Android avisar que o app é perigoso.',
    html: '/manuais/instalar-app.html',
    pdf: '/manuais/Folder-Instalar-o-App.pdf',
    cor: '#E91E8C',
  },
  {
    titulo: 'Cartão de bolso',
    para: 'Todos',
    descricao:
      'Uma folha com o que cada papel faz durante a gincana e o significado de cada etiqueta de status. Feito para imprimir e deixar à vista.',
    html: '/manuais/cartao-de-bolso.html',
    pdf: '/manuais/Folder-Cartao-de-Bolso.pdf',
    cor: '#F59E0B',
  },
  {
    titulo: 'Manual completo',
    para: 'Todos',
    descricao:
      'O guia inteiro: instalação, uso do app, uso do site, o que cada papel faz, dicionário de status e o que fazer quando dá problema.',
    html: '/manuais/manual.html',
    pdf: '/manuais/Manual-Carros-Mik-Dundee.pdf',
    cor: '#60A5FA',
  },
]

export function ManuaisPage() {
  return (
    <div className="min-h-screen bg-zinc-950 overflow-y-auto">
      <div className="mx-auto max-w-3xl px-5 py-10 flex flex-col gap-8">
        <header className="flex items-center gap-4">
          <img src="/jacare.svg" alt="" className="w-16 h-auto rounded-lg shrink-0" />
          <div className="flex flex-col gap-1">
            <span className="text-xs font-mono uppercase tracking-[0.18em] text-[#E91E8C]">
              Gincana Mik Dundee
            </span>
            <h1 className="text-zinc-100 text-2xl font-bold">Manuais</h1>
            <p className="text-zinc-400 text-sm">
              Como instalar o app e como usar o sistema. Abra na tela ou baixe o PDF para
              imprimir e mandar no WhatsApp.
            </p>
          </div>
        </header>

        <div className="flex flex-col gap-4">
          {DOCS.map((d) => (
            <article
              key={d.html}
              className="rounded-xl border border-zinc-800 bg-zinc-900/60 overflow-hidden flex flex-col"
            >
              <div className="h-1" style={{ background: d.cor }} />
              <div className="p-5 flex flex-col gap-3">
                <div className="flex items-baseline justify-between gap-3 flex-wrap">
                  <h2 className="text-zinc-100 text-lg font-semibold">{d.titulo}</h2>
                  <span
                    className="text-[10px] font-mono uppercase tracking-[0.12em] px-2 py-1 rounded-full"
                    style={{ background: `${d.cor}22`, color: d.cor }}
                  >
                    {d.para}
                  </span>
                </div>
                <p className="text-zinc-400 text-sm leading-relaxed">{d.descricao}</p>
                <div className="flex flex-wrap gap-2 pt-1">
                  <a
                    href={d.html}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-lg bg-[#E91E8C] px-4 py-2 text-sm font-semibold text-white hover:bg-[#B5146D] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E91E8C] focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
                  >
                    Abrir
                  </a>
                  {/* download força o "salvar como" em vez de abrir o leitor de
                      PDF do navegador — quem clica aqui quer o arquivo para
                      imprimir ou mandar, não para ler na aba. */}
                  <a
                    href={d.pdf}
                    download
                    className="rounded-lg border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-300 hover:border-zinc-600 hover:text-zinc-100 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500"
                  >
                    Baixar PDF
                  </a>
                </div>
              </div>
            </article>
          ))}
        </div>

        <footer className="border-t border-zinc-800 pt-5 flex items-center justify-between gap-4 flex-wrap">
          <p className="text-zinc-600 text-xs">
            Dúvida que o manual não resolve? Fale com a Mesa Central.
          </p>
          <Link
            to="/"
            className="text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            Ir para o sistema →
          </Link>
        </footer>
      </div>
    </div>
  )
}
