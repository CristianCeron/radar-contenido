// El botón de ayuda y el modal de bienvenida se comunican con un evento del navegador, así el
// encabezado no necesita conocer el modal.
export const WELCOME_EVENT = "radar:bienvenida";

const SEEN_KEY = "radar30x.bienvenida";

export function openWelcome(): void {
  window.dispatchEvent(new Event(WELCOME_EVENT));
}

// La bienvenida sale sola en la primera visita. Si el almacenamiento está bloqueado no hay forma de
// recordar que ya se vio, así que no se abre sola: queda el botón de ayuda.
export function shouldShowWelcome(storage: Storage): boolean {
  try {
    return storage.getItem(SEEN_KEY) === null;
  } catch {
    return false;
  }
}

export function markWelcomeSeen(storage: Storage): void {
  try {
    storage.setItem(SEEN_KEY, "1");
  } catch {
    // sin almacenamiento la página sigue funcionando
  }
}
