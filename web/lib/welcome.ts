// El botón de ayuda y el modal de bienvenida se comunican con un evento del navegador, así el
// encabezado no necesita conocer el modal.
export const WELCOME_EVENT = "radar:bienvenida";

export function openWelcome(): void {
  window.dispatchEvent(new Event(WELCOME_EVENT));
}
