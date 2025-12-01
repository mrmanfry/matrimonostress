/**
 * Helper functions for consistent RSVP status handling across the application.
 * Supports both Italian and English status strings for database compatibility.
 */

export const isDeclined = (status: string | null | undefined): boolean => 
  status === 'Rifiutato' || status === 'declined';

export const isConfirmed = (status: string | null | undefined): boolean => 
  status === 'Confermato' || status === 'confirmed';

export const isPending = (status: string | null | undefined): boolean => 
  !status || status === 'In attesa' || status === 'pending';
