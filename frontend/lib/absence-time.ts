// Gli orari possono essere valorizzati anche con giornataIntera=true (tipi con richiedeOrario).
export function absenceTimeRange(entry: { oraInizio: string | null; oraFine: string | null }): string | null {
  if (entry.oraInizio && entry.oraFine) {
    return `${entry.oraInizio.slice(0, 5)}–${entry.oraFine.slice(0, 5)}`;
  }
  return null;
}
