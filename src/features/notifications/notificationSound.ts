// Bipe curto para mensagem nova.
//
// Sintetizado com WebAudio em vez de tocar um arquivo: nada para baixar, nada
// para dar 404 e nada que dependa de o asset ter subido no deploy. São duas
// notas curtas — o suficiente para virar a cabeça de quem está de olho no mapa,
// sem soar como alarme.
//
// A política de autoplay dos navegadores exige um gesto do usuário antes de
// tocar áudio. Na prática a Mesa Central já clicou em algo muito antes da
// primeira mensagem, mas o contexto ainda pode nascer suspenso — daí o resume()
// e o silêncio em caso de falha: som é um extra, o toast é o aviso de verdade.

let ctx: AudioContext | null = null

function context(): AudioContext | null {
  if (ctx) return ctx
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!Ctor) return null
  try {
    ctx = new Ctor()
    return ctx
  } catch {
    return null
  }
}

function beep(at: number, freq: number, duration: number) {
  const c = ctx!
  const osc = c.createOscillator()
  const gain = c.createGain()

  osc.type = 'sine'
  osc.frequency.value = freq

  // Envelope em rampa, não liga/desliga seco: um ganho que salta de 0 produz
  // um clique audível na maioria dos alto-falantes.
  gain.gain.setValueAtTime(0, at)
  gain.gain.linearRampToValueAtTime(0.12, at + 0.01)
  gain.gain.exponentialRampToValueAtTime(0.0001, at + duration)

  osc.connect(gain).connect(c.destination)
  osc.start(at)
  osc.stop(at + duration)
}

export function playMessageChime() {
  const c = context()
  if (!c) return

  const fire = () => {
    const t = c.currentTime
    beep(t, 880, 0.12)          // lá
    beep(t + 0.11, 1174.66, 0.16) // ré, uma quarta acima
  }

  if (c.state === 'suspended') {
    // Sem gesto ainda: tenta destravar e desiste em silêncio se o navegador
    // recusar. Nunca vira erro na tela.
    c.resume().then(fire).catch(() => {})
    return
  }
  fire()
}
