import * as Sentry from '@sentry/react'
import { Component, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error) {
    console.error('[ErrorBoundary]', error)
    Sentry.captureException(error)
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div className="flex flex-col items-center justify-center h-full p-8 text-center gap-3">
            <p className="text-zinc-300 text-sm font-medium">Algo deu errado.</p>
            <p className="text-zinc-500 text-xs">Recarregue a página para continuar.</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-1 px-4 py-2 text-sm rounded-lg bg-zinc-800 text-zinc-200 hover:bg-zinc-700 transition-colors"
            >
              Recarregar
            </button>
          </div>
        )
      )
    }
    return this.props.children
  }
}
