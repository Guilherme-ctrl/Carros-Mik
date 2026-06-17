import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { Button } from '../../shared/components/ui/Button'
import { Card, CardContent, CardHeader } from '../../shared/components/ui/Card'
import { Input } from '../../shared/components/ui/Input'

const ROLES = [
  { value: 'driver', label: 'Motorista' },
  { value: 'table_leader', label: 'Líder de Mesa' },
  { value: 'central_operator', label: 'Operador Central' },
  { value: 'central_admin', label: 'Administrador' },
]

export function CreateUserPage() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('driver')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    try {
      const { data, error: fnError } = await supabase.functions.invoke('create-user', {
        body: { email, password, name, role },
      })

      if (fnError) {
        const msg = (data as { error?: string } | null)?.error ?? fnError.message
        throw new Error(msg.includes('already registered') ? 'Este email já está cadastrado.' : msg)
      }

      setSuccess(`Usuário ${email} criado com sucesso.`)
      setName('')
      setEmail('')
      setPassword('')
      setRole('driver')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar usuário')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 p-6">
      <div className="max-w-md mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate('/admin/users')}>
            ← Voltar
          </Button>
          <h1 className="text-zinc-100 text-lg font-semibold">Criar Usuário</h1>
        </div>

        <Card>
          <CardHeader>
            <p className="text-zinc-400 text-sm">
              Preencha os dados do novo usuário. A senha pode ser alterada pela Mesa Central após o evento.
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2">
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}
              {success && (
                <div className="rounded-lg bg-green-500/10 border border-green-500/20 px-3 py-2">
                  <p className="text-green-400 text-sm">{success}</p>
                </div>
              )}

              <Input
                label="Nome"
                placeholder="Ex: João Silva"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={loading}
              />

              <Input
                label="Email"
                type="email"
                placeholder="joao@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />

              <Input
                label="Senha temporária"
                type="text"
                placeholder="Mínimo 6 caracteres"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                disabled={loading}
              />

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-zinc-300">Papel</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  disabled={loading}
                  className="h-9 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {ROLES.map((r) => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>

              <Button type="submit" loading={loading} className="w-full">
                Criar usuário
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
