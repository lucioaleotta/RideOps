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
  richiedeDocumentoDefault?: boolean;
  scalaDaMonteOreDefault?: boolean;
  preavvisoMinimoGiorniDefault: number;
  numeroGiorniAnnuiDefault?: number | null;
  numeroGiorniMalattiaAnnuiDefault?: number | null;
  scadenzaFerieMesiDefault?: number | null;
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
  conflittiTurno?: ConflittoTurnoAssenza[];
};

export type ConflittoTurnoAssenza = {
  servizioId: number;
  inizio: string;
  durataOre: number | null;
  partenza: string;
  destinazione: string;
};

export type SaldoAssenza = {
  tipoAssenzaId: number;
  codice: string;
  nome: string;
  unitaMisura: UnitaMisuraAssenza;
  quantitaMaturata: number;
  quantitaUtilizzata: number;
  residuoValido: number;
  residuoScaduto: number;
  saldoAnnuale: boolean;
  saldoCaricato: boolean;
  monteOreAbilitato: boolean;
  scadenzaFerieMesi: number | null;
};

export type CalendarioAssenza = {
  richiestaId: number;
  driverId: number;
  tipoAssenzaId: number;
  tipoAssenzaCodice: string | null;
  tipoAssenzaNome: string | null;
  dataInizio: string;
  dataFine: string;
  giornataIntera: boolean;
  oraInizio: string | null;
  oraFine: string | null;
  origine: OrigineRichiestaAssenza;
  richiedeApprovazioneEccezionale: boolean;
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

export type ConfigurazioneAssenzaValues = {
  abilitato: boolean;
  richiedeDocumento: boolean;
  monteOreAbilitato: boolean;
  numeroGiorniAnnui: number | null;
  numeroGiorniMalattiaAnnui: number | null;
  scadenzaFerieMesi: number | null;
  preavvisoMinimoGiorni: number;
  noteConfigurazione: string | null;
};

export type ConfigurazioneAssenza = ConfigurazioneAssenzaValues & {
  tipoAssenzaId: number;
  codice: string;
  nome: string;
  unitaMisura: UnitaMisuraAssenza;
  richiedeOrario: boolean;
  personalizzato: boolean;
  defaultPiattaforma: ConfigurazioneAssenzaValues;
};

export type RegoleGeneraliAssenza = {
  comportamentoConflittoTurni: 'SEGNALA' | 'SEGNALA_E_BLOCCA';
  defaultPiattaforma: 'SEGNALA';
};

export type DriverConfigurazioneAssenza = {
  driverId: number;
  firstName: string | null;
  lastName: string | null;
  personalizzato: boolean;
  configurazioneEffettiva: ConfigurazioneAssenza;
};

export type RettificaSaldo = {
  driverId: number;
  tipoAssenzaId: number;
  codice: string;
  nome: string;
  anno: number;
  maturatoAttuale: number;
  giaUtilizzato: number;
  quotaConfigurata: number;
  maturatoDopoRettifica: number;
  differenza: number;
  applicabile: boolean;
};

export type AssenzaSessionUser = {
  id: number;
  userId: string;
  email: string;
  role: string;
  tenantId: number | null;
};
