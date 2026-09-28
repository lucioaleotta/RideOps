export type UnitaMisuraAssenza = 'GIORNI' | 'ORE';

export type OrigineRichiestaAssenza = 'DRIVER' | 'GESTIONALE';

export type StatoRichiestaAssenza = 'BOZZA' | 'IN_ATTESA' | 'APPROVATA' | 'RIFIUTATA' | 'ANNULLATA';

export type TipoAssenza = {
  id: number;
  codice: string;
  nome: string;
  unitaMisura: UnitaMisuraAssenza;
  origineDriverConsentita: boolean;
  origineGestionaleConsentita: boolean;
  richiedeOrario: boolean;
  preavvisoMinimoGiorniDefault: number;
  attivo: boolean;
};

export type RichiestaAssenza = {
  id: number;
  driverId: number;
  tipoAssenzaId: number;
  tipoAssenzaCodice: string | null;
  tipoAssenzaNome: string | null;
  origine: OrigineRichiestaAssenza;
  dataInizio: string;
  dataFine: string;
  giornataIntera: boolean;
  oraInizio: string | null;
  oraFine: string | null;
  stato: StatoRichiestaAssenza;
  richiedeApprovazioneEccezionale: boolean;
  motivazione: string | null;
  motivoRifiuto: string | null;
  approvataDa: number | null;
  dataDecisione: string | null;
  creatoIl: string;
  aggiornatoIl: string;
};

export type DriverAssenzaOption = {
  driverId: number;
  firstName: string | null;
  lastName: string | null;
};

export type NuovaRichiestaAssenzaPayload = {
  tipoAssenzaId: number;
  dataInizio: string;
  dataFine: string;
  giornataIntera: boolean;
  oraInizio?: string | null;
  oraFine?: string | null;
  motivazione?: string | null;
};

export type InserimentoGestionalePayload = NuovaRichiestaAssenzaPayload & {
  driverId: number;
};
