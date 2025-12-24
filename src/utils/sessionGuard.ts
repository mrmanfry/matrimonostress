/**
 * Session Guard Utility
 * 
 * Gestisce la persistenza delle sessioni in base alla scelta dell'utente "Resta collegato".
 * Poiché il client Supabase usa localStorage di default (non modificabile),
 * implementiamo un workaround che pulisce manualmente i token alla chiusura del browser
 * quando l'utente NON ha selezionato "Resta collegato".
 */

const VOLATILE_SESSION_KEY = 'NSS_VOLATILE_SESSION';
const SUPABASE_TOKEN_PREFIX = 'sb-';

export const sessionGuard = {
  /**
   * Marca la sessione corrente come "volatile" (da cancellare alla chiusura).
   * Chiamato quando l'utente fa login SENZA spuntare "Resta collegato".
   */
  markAsVolatile(): void {
    sessionStorage.setItem(VOLATILE_SESSION_KEY, 'true');
    console.log('[SessionGuard] Sessione marcata come volatile');
  },

  /**
   * Marca la sessione come "persistente" (mantiene i token).
   * Chiamato quando l'utente fa login CON "Resta collegato" attivo.
   */
  markAsPersistent(): void {
    sessionStorage.removeItem(VOLATILE_SESSION_KEY);
    console.log('[SessionGuard] Sessione marcata come persistente');
  },

  /**
   * Verifica se la sessione corrente è volatile.
   */
  isVolatile(): boolean {
    return sessionStorage.getItem(VOLATILE_SESSION_KEY) === 'true';
  },

  /**
   * Pulisce il flag di sessione volatile.
   */
  clearMark(): void {
    sessionStorage.removeItem(VOLATILE_SESSION_KEY);
  },

  /**
   * Rimuove tutti i token Supabase dal localStorage.
   * Usato per implementare il comportamento "non restare loggato".
   */
  clearSupabaseTokens(): void {
    const keysToRemove = Object.keys(localStorage).filter(
      key => key.startsWith(SUPABASE_TOKEN_PREFIX)
    );
    
    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
      console.log('[SessionGuard] Rimosso token:', key);
    });
  }
};

/**
 * Inizializza il Session Guard.
 * Deve essere chiamato all'avvio dell'applicazione (in main.tsx).
 * 
 * Attacca un listener su 'beforeunload' che, se la sessione è volatile,
 * pulisce i token di Supabase dal localStorage prima della chiusura.
 */
export function initSessionGuard(): void {
  // Listener per la chiusura del browser/tab
  window.addEventListener('beforeunload', () => {
    if (sessionGuard.isVolatile()) {
      console.log('[SessionGuard] Sessione volatile, pulizia token in corso...');
      sessionGuard.clearSupabaseTokens();
    }
  });

  // Listener per quando la visibilità della pagina cambia (fallback per mobile)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden' && sessionGuard.isVolatile()) {
      // Su mobile, beforeunload potrebbe non essere affidabile
      // Usiamo visibilitychange come backup
      sessionGuard.clearSupabaseTokens();
    }
  });

  console.log('[SessionGuard] Inizializzato');
}
