import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../../shared/components/ui/Button'
import { Card, CardContent, CardHeader } from '../../shared/components/ui/Card'
import { Input } from '../../shared/components/ui/Input'
import { useAuth } from './useAuth'

export function LoginPage() {
  const signIn = useAuth((s) => s.signIn)
  const isLoading = useAuth((s) => s.isLoading)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const navigate = useNavigate()

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    try {
      await signIn(email, password)
      navigate('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Email ou senha incorretos')
    }
  }

  return (
    <div className="min-h-screen bg-surface-0 flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <img src="/jacare.svg" alt="Jacaré Mik Dundee" className="w-32 h-auto" />
          <h1 className="font-display text-2xl font-bold text-on-surface tracking-tight">
            Mik Dundee
          </h1>
          <p className="text-on-surface-muted text-sm">Painel de operações</p>
        </div>

        <Card>
          <CardHeader>
            <h2 className="text-on-surface-muted text-sm font-medium">Entrar na sua conta</h2>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="rounded-lg bg-status-unavailable-bg border border-status-unavailable/20 px-3 py-2">
                  <p className="text-status-unavailable text-sm">{error}</p>
                </div>
              )}

              <Input
                label="Email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
                autoComplete="email"
              />

              <Input
                label="Senha"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
                autoComplete="current-password"
              />

              <Button type="submit" loading={isLoading} className="w-full mt-2">
                Entrar
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
