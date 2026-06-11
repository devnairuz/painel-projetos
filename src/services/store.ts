/**
 * Barramento de mudanças do lado do cliente. O "banco" agora é o servidor
 * (fonte única). Aqui só notificamos as telas para revalidarem após uma
 * mutação — na mesma aba (evento), em outras abas (BroadcastChannel) e como
 * fallback o evento `storage`. Combinado ao poll/foco do useAsync, mantém
 * Nairuz e cliente em sincronia.
 */
const CHANGE_EVENT = 'nairuz-portal:changed'
const channel: BroadcastChannel | null =
  typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('nairuz-portal') : null

/** Dispara após uma mutação bem-sucedida na API. */
export function notifyChange(): void {
  try {
    window.dispatchEvent(new Event(CHANGE_EVENT))
  } catch {
    // ambiente sem window
  }
  channel?.postMessage('changed')
}

/** Assina mudanças (mesma aba + outras abas). Retorna o cancelador. */
export function subscribe(cb: () => void): () => void {
  const onLocal = () => cb()
  const onChannel = () => cb()
  const onStorage = (e: StorageEvent) => {
    if (e.key === 'nairuz-portal:ping') cb()
  }
  window.addEventListener(CHANGE_EVENT, onLocal)
  window.addEventListener('storage', onStorage)
  if (channel) channel.addEventListener('message', onChannel)
  return () => {
    window.removeEventListener(CHANGE_EVENT, onLocal)
    window.removeEventListener('storage', onStorage)
    if (channel) channel.removeEventListener('message', onChannel)
  }
}
