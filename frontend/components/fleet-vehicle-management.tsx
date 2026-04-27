"use client";

import { FormEvent, useEffect, useRef, useState } from 'react';
import { AddIcon, ButtonContent, CancelIcon, DeleteIcon, EditIcon, FilterIcon, LockIcon, ResetIcon, SaveIcon, SelectIcon } from './action-icons';
import { StatusNotice } from './status-notice';
import { FilterDropdown } from './filter-dropdown';
import { FleetDeadlinesAlerts } from './fleet-deadlines-alerts';

type VehicleType = 'SEDAN' | 'VAN' | 'MINIBUS' | 'SUV' | 'OTHER';
type DeadlineType = 'BOLLO' | 'ASSICURAZIONE' | 'REVISIONE' | 'TAGLIANDO' | 'ALTRO';
type DeadlineStatus = 'DA_ESEGUIRE' | 'IN_SCADENZA' | 'SCADUTA' | 'PAGATA' | 'ESEGUITA' | 'ANNULLATA';

type VehicleItem = {
  id: number;
  plate: string;
  seats: number;
  type: VehicleType;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

type OccurrenceItem = {
  id: number;
  vehicleId: number;
  planId: number | null;
  type: DeadlineType;
  title: string;
  description: string | null;
  dueDate: string;
  status: DeadlineStatus;
  cost: number;
  currency: string;
  notes: string | null;
  paymentDate: string | null;
  executionDate: string | null;
  createdAt: string;
  updatedAt: string;
};

type PlanItem = {
  id: number;
  vehicleId: number;
  type: DeadlineType;
  title: string;
  description: string | null;
  recurrenceMonths: number;
  nextDueDate: string;
  standardCost: number;
  currency: string;
  active: boolean;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

type VehicleDetail = {
  vehicle: VehicleItem;
  upcomingCount: number;
  overdueCount: number;
  occurrences: OccurrenceItem[];
  plans: PlanItem[];
};

type OccurrenceFormState = {
  planId: number | '';
  type: DeadlineType;
  title: string;
  description: string;
  dueDate: string;
  status: DeadlineStatus;
  cost: string;
  currency: string;
  notes: string;
  paymentDate: string;
  executionDate: string;
};

type PlanFormState = {
  type: DeadlineType;
  title: string;
  description: string;
  recurrenceMonths: string;
  nextDueDate: string;
  standardCost: string;
  currency: string;
  notes: string;
};

type UnavailabilityItem = {
  id: number;
  vehicleId: number;
  startDate: string;
  endDate: string;
  reason: string;
  createdAt: string;
  updatedAt: string;
};

type UnavailabilityFormState = {
  startDate: string;
  endDate: string;
  reason: string;
};

const defaultOccurrenceForm: OccurrenceFormState = {
  planId: '',
  type: 'BOLLO',
  title: '',
  description: '',
  dueDate: '',
  status: 'IN_SCADENZA',
  cost: '0',
  currency: 'EUR',
  notes: '',
  paymentDate: '',
  executionDate: ''
};

const defaultPlanForm: PlanFormState = {
  type: 'BOLLO',
  title: '',
  description: '',
  recurrenceMonths: '12',
  nextDueDate: '',
  standardCost: '0',
  currency: 'EUR',
  notes: ''
};

const defaultUnavailabilityForm: UnavailabilityFormState = {
  startDate: '',
  endDate: '',
  reason: ''
};

function typeLabel(type: DeadlineType) {
  if (type === 'BOLLO') return 'Bollo';
  if (type === 'ASSICURAZIONE') return 'Assicurazione';
  if (type === 'REVISIONE') return 'Revisione';
  if (type === 'TAGLIANDO') return 'Tagliando';
  return 'Altro';
}

function statusLabel(status: DeadlineStatus) {
  if (status === 'DA_ESEGUIRE') return 'Da eseguire';
  if (status === 'IN_SCADENZA') return 'In scadenza';
  if (status === 'SCADUTA') return 'Scaduta';
  if (status === 'PAGATA') return 'Pagata';
  if (status === 'ESEGUITA') return 'Eseguita';
  return 'Annullata';
}

function isOverdueStatus(status: DeadlineStatus) {
  return status === 'SCADUTA';
}

function isDueSoonStatus(status: DeadlineStatus, dueDate: string) {
  if (status !== 'DA_ESEGUIRE' && status !== 'IN_SCADENZA') {
    return false;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const normalizedDueDate = dueDate.split('T')[0];
  const due = new Date(`${normalizedDueDate}T00:00:00`);
  if (Number.isNaN(due.getTime())) {
    return false;
  }

  const diffMs = due.getTime() - today.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  return diffDays >= 0 && diffDays <= 7;
}

function canMarkOccurrenceAsPaid(item: OccurrenceItem) {
  const payableType = item.type === 'BOLLO' || item.type === 'ASSICURAZIONE';
  return payableType && item.status !== 'PAGATA' && item.status !== 'ANNULLATA';
}

function canMarkOccurrenceAsCompleted(item: OccurrenceItem) {
  const executableType = item.type === 'REVISIONE' || item.type === 'TAGLIANDO' || item.type === 'ALTRO';
  return executableType && item.status !== 'ESEGUITA' && item.status !== 'ANNULLATA';
}

function canCancelOccurrence(item: OccurrenceItem) {
  return item.status !== 'ANNULLATA';
}

const STATUS_OPTIONS: { value: DeadlineStatus; label: string }[] = [
  { value: 'DA_ESEGUIRE', label: 'Da eseguire' },
  { value: 'IN_SCADENZA', label: 'In scadenza' },
  { value: 'SCADUTA', label: 'Scaduta' },
  { value: 'PAGATA', label: 'Pagata' },
  { value: 'ESEGUITA', label: 'Eseguita' },
  { value: 'ANNULLATA', label: 'Annullata' },
];

function allowedStatusesForType(type: DeadlineType): { value: DeadlineStatus; label: string }[] {
  const isPayable = type === 'BOLLO' || type === 'ASSICURAZIONE';
  return STATUS_OPTIONS.filter((s) =>
    isPayable ? s.value !== 'ESEGUITA' && s.value !== 'DA_ESEGUIRE' : s.value !== 'PAGATA'
  );
}

function sanitizeStatusForType(status: DeadlineStatus, type: DeadlineType): DeadlineStatus {
  const allowed = allowedStatusesForType(type);
  return allowed.some((s) => s.value === status) ? status : allowed[0].value;
}

type FleetVehicleManagementProps = {
  userRole?: string;
  initialVehicleId?: number;
};

export function FleetVehicleManagement({ userRole = 'UNKNOWN', initialVehicleId }: FleetVehicleManagementProps) {
  const [vehicles, setVehicles] = useState<VehicleItem[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<number | ''>('');
  const [detail, setDetail] = useState<VehicleDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [vehicleModal, setVehicleModal] = useState<null | 'create' | 'edit'>(null);
  const vehicleModalRef = useRef<HTMLDivElement>(null);
  const [vehicleFiltersOpen, setVehicleFiltersOpen] = useState(false);
  const [plateFilter, setPlateFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | VehicleType>('ALL');
  const [seatsFilter, setSeatsFilter] = useState('');

  const [vehicleForm, setVehicleForm] = useState({ plate: '', seats: '', type: 'SEDAN' as VehicleType, notes: '' });
  const [newVehicleForm, setNewVehicleForm] = useState({ plate: '', seats: '', type: 'SEDAN' as VehicleType, notes: '' });
  const [occurrenceForm, setOccurrenceForm] = useState<OccurrenceFormState>(defaultOccurrenceForm);
  const [planForm, setPlanForm] = useState<PlanFormState>(defaultPlanForm);
  const [unavailabilities, setUnavailabilities] = useState<UnavailabilityItem[]>([]);
  const [unavailabilityForm, setUnavailabilityForm] = useState<UnavailabilityFormState>(defaultUnavailabilityForm);

  const [occurrenceModalOpen, setOccurrenceModalOpen] = useState(false);
  const [planModalOpen, setPlanModalOpen] = useState(false);
  const [unavailabilityModalOpen, setUnavailabilityModalOpen] = useState(false);
  const [editingOccurrenceId, setEditingOccurrenceId] = useState<number | null>(null);
  const [editingPlanId, setEditingPlanId] = useState<number | null>(null);
  const [editingUnavailabilityId, setEditingUnavailabilityId] = useState<number | null>(null);
  const [occurrenceActionLoadingId, setOccurrenceActionLoadingId] = useState<number | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const isAdmin = userRole.toUpperCase() === 'ADMIN';

  function refreshFleetAlertBadge() {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('fleet-alerts-refresh'));
      document.dispatchEvent(new Event('fleet-alerts-refresh'));

      window.setTimeout(() => {
        window.dispatchEvent(new Event('fleet-alerts-refresh'));
        document.dispatchEvent(new Event('fleet-alerts-refresh'));
      }, 350);
    }
  }

  async function loadVehicles() {
    const response = await fetch('/api/fleet/vehicles', { cache: 'no-store' });
    const payload = (await response.json().catch(() => [])) as VehicleItem[] | { message?: string };

    if (!response.ok) {
      setError((payload as { message?: string }).message ?? 'Errore caricamento veicoli');
      return;
    }

    const items = payload as VehicleItem[];
    setVehicles(items);

    if (selectedVehicleId && !items.some((item) => item.id === selectedVehicleId)) {
      setSelectedVehicleId('');
      setDetail(null);
      setVehicleModal(null);
    }
  }

  async function loadVehicleDetail(vehicleId: number) {
    setLoading(true);
    setError(null);

    const response = await fetch(`/api/fleet/vehicles/${vehicleId}/detail?withinDays=30`, { cache: 'no-store' });
    const payload = (await response.json().catch(() => ({}))) as VehicleDetail | { message?: string };

    if (!response.ok) {
      setError((payload as { message?: string }).message ?? 'Errore caricamento dettaglio veicolo');
      setLoading(false);
      return;
    }

    const detailPayload = payload as VehicleDetail;
    setDetail(detailPayload);
    setVehicleForm({
      plate: detailPayload.vehicle.plate,
      seats: String(detailPayload.vehicle.seats),
      type: detailPayload.vehicle.type,
      notes: detailPayload.vehicle.notes ?? ''
    });
    setLoading(false);
  }

  async function loadVehicleUnavailabilities(vehicleId: number) {
    const response = await fetch(`/api/fleet/vehicles/${vehicleId}/unavailabilities`, { cache: 'no-store' });
    const payload = (await response.json().catch(() => [])) as UnavailabilityItem[] | { message?: string };

    if (!response.ok) {
      setError((payload as { message?: string }).message ?? 'Errore caricamento manutenzioni veicolo');
      return;
    }

    setUnavailabilities(payload as UnavailabilityItem[]);
  }

  useEffect(() => {
    loadVehicles();
  }, []);

  useEffect(() => {
    if (selectedVehicleId) {
      loadVehicleDetail(selectedVehicleId);
      loadVehicleUnavailabilities(selectedVehicleId);
    } else {
      setDetail(null);
      setUnavailabilities([]);
      setLoading(false);
    }
  }, [selectedVehicleId]);

  useEffect(() => {
    if (!initialVehicleId || selectedVehicleId) {
      return;
    }

    if (vehicles.some((item) => item.id === initialVehicleId)) {
      setSelectedVehicleId(initialVehicleId);
    }
  }, [initialVehicleId, selectedVehicleId, vehicles]);

  const occurrences = detail?.occurrences ?? [];
  const plans = detail?.plans ?? [];
  const normalizedPlateFilter = plateFilter.trim().toLowerCase();
  const normalizedSeatsFilter = seatsFilter.trim();
  const filteredVehicles = vehicles.filter((vehicle) => {
    if (normalizedPlateFilter && !vehicle.plate.toLowerCase().includes(normalizedPlateFilter)) {
      return false;
    }

    if (typeFilter !== 'ALL' && vehicle.type !== typeFilter) {
      return false;
    }

    if (normalizedSeatsFilter) {
      const seatsValue = Number(normalizedSeatsFilter);
      if (Number.isNaN(seatsValue) || vehicle.seats !== seatsValue) {
        return false;
      }
    }

    return true;
  });

  async function saveVehicle(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedVehicleId) return;

    setError(null);
    setSuccess(null);

    const response = await fetch(`/api/fleet/vehicles/${selectedVehicleId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        plate: vehicleForm.plate,
        seats: Number(vehicleForm.seats),
        type: vehicleForm.type,
        notes: vehicleForm.notes.trim() || null
      })
    });

    const payload = (await response.json().catch(() => ({}))) as { message?: string };
    if (!response.ok) {
      setError(payload.message ?? 'Aggiornamento veicolo fallito');
      return;
    }

    setSuccess('Dati veicolo aggiornati');
    setVehicleModal(null);
    await loadVehicles();
    await loadVehicleDetail(selectedVehicleId);
  }

  async function createVehicle(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError(null);
    setSuccess(null);

    const response = await fetch('/api/fleet/vehicles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        plate: newVehicleForm.plate,
        seats: Number(newVehicleForm.seats),
        type: newVehicleForm.type,
        notes: newVehicleForm.notes.trim() || null
      })
    });

    const payload = (await response.json().catch(() => ({}))) as VehicleItem & { message?: string };
    if (!response.ok) {
      setError(payload.message ?? 'Creazione veicolo fallita');
      return;
    }

    setSuccess('Veicolo creato');
    setNewVehicleForm({ plate: '', seats: '', type: 'SEDAN', notes: '' });
    setVehicleModal(null);

    await loadVehicles();
  }

  function vehicleTypeLabel(type: VehicleType) {
    if (type === 'SEDAN') return 'Sedan';
    if (type === 'VAN') return 'Van';
    if (type === 'MINIBUS') return 'Minibus';
    if (type === 'SUV') return 'Suv';
    return 'Altro';
  }

  function resetVehicleFilters() {
    setPlateFilter('');
    setTypeFilter('ALL');
    setSeatsFilter('');
  }

  const activeVehicleFilterChips: { key: string; label: string; onRemove: () => void }[] = [];
  if (plateFilter.trim()) {
    activeVehicleFilterChips.push({
      key: 'plate',
      label: `Targa: ${plateFilter.trim()}`,
      onRemove: () => setPlateFilter('')
    });
  }
  if (typeFilter !== 'ALL') {
    activeVehicleFilterChips.push({
      key: 'type',
      label: `Tipo: ${vehicleTypeLabel(typeFilter)}`,
      onRemove: () => setTypeFilter('ALL')
    });
  }
  if (seatsFilter.trim()) {
    activeVehicleFilterChips.push({
      key: 'seats',
      label: `Posti: ${seatsFilter.trim()}`,
      onRemove: () => setSeatsFilter('')
    });
  }

  function selectVehicle(vehicleId: number) {
    setSelectedVehicleId(vehicleId);
  }

  function editVehicle(vehicle: VehicleItem) {
    setSelectedVehicleId(vehicle.id);
    setVehicleForm({
      plate: vehicle.plate,
      seats: String(vehicle.seats),
      type: vehicle.type,
      notes: vehicle.notes ?? ''
    });
    setVehicleModal('edit');
  }

  function openOccurrenceCreateModal() {
    setEditingOccurrenceId(null);
    setOccurrenceForm(defaultOccurrenceForm);
    setOccurrenceModalOpen(true);
  }

  function openOccurrenceEditModal(item: OccurrenceItem) {
    setEditingOccurrenceId(item.id);
    setOccurrenceForm({
      planId: item.planId ?? '',
      type: item.type,
      title: item.title,
      description: item.description ?? '',
      dueDate: item.dueDate,
      status: item.status,
      cost: String(item.cost),
      currency: item.currency,
      notes: item.notes ?? '',
      paymentDate: item.paymentDate ?? '',
      executionDate: item.executionDate ?? ''
    });
    setOccurrenceModalOpen(true);
  }

  function openPlanCreateModal() {
    setEditingPlanId(null);
    setPlanForm(defaultPlanForm);
    setPlanModalOpen(true);
  }

  function openPlanEditModal(item: PlanItem) {
    setEditingPlanId(item.id);
    setPlanForm({
      type: item.type,
      title: item.title,
      description: item.description ?? '',
      recurrenceMonths: String(item.recurrenceMonths),
      nextDueDate: item.nextDueDate,
      standardCost: String(item.standardCost),
      currency: item.currency,
      notes: item.notes ?? ''
    });
    setPlanModalOpen(true);
  }

  function openUnavailabilityCreateModal() {
    setEditingUnavailabilityId(null);
    setUnavailabilityForm(defaultUnavailabilityForm);
    setUnavailabilityModalOpen(true);
  }

  function openUnavailabilityEditModal(item: UnavailabilityItem) {
    setEditingUnavailabilityId(item.id);
    setUnavailabilityForm({
      startDate: item.startDate,
      endDate: item.endDate,
      reason: item.reason
    });
    setUnavailabilityModalOpen(true);
  }

  async function saveOccurrence(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedVehicleId) return;

    setError(null);
    setSuccess(null);

    const payload = {
      planId: occurrenceForm.planId || null,
      type: occurrenceForm.type,
      title: occurrenceForm.title,
      description: occurrenceForm.description.trim() || null,
      dueDate: occurrenceForm.dueDate,
      status: occurrenceForm.status,
      cost: Number(occurrenceForm.cost),
      currency: occurrenceForm.currency.trim().toUpperCase(),
      notes: occurrenceForm.notes.trim() || null,
      paymentDate: occurrenceForm.paymentDate || null,
      executionDate: occurrenceForm.executionDate || null
    };

    const targetUrl = editingOccurrenceId
      ? `/api/fleet/occurrences/${editingOccurrenceId}`
      : `/api/fleet/vehicles/${selectedVehicleId}/occurrences`;

    const response = await fetch(targetUrl, {
      method: editingOccurrenceId ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const responseBody = (await response.json().catch(() => ({}))) as { message?: string };
    if (!response.ok) {
      setError(responseBody.message ?? 'Salvataggio occorrenza fallito');
      return;
    }

    setSuccess(editingOccurrenceId ? 'Occorrenza aggiornata' : 'Occorrenza creata');
    setOccurrenceForm(defaultOccurrenceForm);
    setEditingOccurrenceId(null);
    setOccurrenceModalOpen(false);
    refreshFleetAlertBadge();
    await loadVehicleDetail(selectedVehicleId);
  }

  async function savePlan(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedVehicleId) return;

    setError(null);
    setSuccess(null);

    const payload = {
      type: planForm.type,
      title: planForm.title,
      description: planForm.description.trim() || null,
      recurrenceMonths: Number(planForm.recurrenceMonths),
      nextDueDate: planForm.nextDueDate,
      standardCost: Number(planForm.standardCost),
      currency: planForm.currency.trim().toUpperCase(),
      notes: planForm.notes.trim() || null
    };

    const targetUrl = editingPlanId
      ? `/api/fleet/plans/${editingPlanId}`
      : `/api/fleet/vehicles/${selectedVehicleId}/plans`;

    const response = await fetch(targetUrl, {
      method: editingPlanId ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const responseBody = (await response.json().catch(() => ({}))) as { message?: string };
    if (!response.ok) {
      setError(responseBody.message ?? 'Salvataggio piano fallito');
      return;
    }

    setSuccess(editingPlanId ? 'Piano aggiornato' : 'Piano creato');
    setPlanForm(defaultPlanForm);
    setEditingPlanId(null);
    setPlanModalOpen(false);
    refreshFleetAlertBadge();
    await loadVehicleDetail(selectedVehicleId);
  }

  async function quickOccurrenceAction(occurrenceId: number, action: 'paid' | 'completed' | 'cancel') {
    const currentOccurrence = occurrences.find((item) => item.id === occurrenceId);
    if (!currentOccurrence) {
      return;
    }

    if (action === 'paid' && !canMarkOccurrenceAsPaid(currentOccurrence)) {
      setError('Per questa voce non e` possibile usare "Segna pagata"');
      return;
    }

    if (action === 'completed' && !canMarkOccurrenceAsCompleted(currentOccurrence)) {
      setError('Per questa voce non e` possibile usare "Segna eseguita"');
      return;
    }

    if (action === 'cancel' && !canCancelOccurrence(currentOccurrence)) {
      setError('La voce e` gia` annullata');
      return;
    }

    if (occurrenceActionLoadingId === occurrenceId) {
      return;
    }

    setError(null);
    setSuccess(null);
    setOccurrenceActionLoadingId(occurrenceId);

    try {
      const response = await fetch(`/api/fleet/occurrences/${occurrenceId}/${action}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: action === 'cancel' ? undefined : JSON.stringify({ date: new Date().toISOString().slice(0, 10) })
      });

      const payload = (await response.json().catch(() => ({}))) as { message?: string };
      if (!response.ok) {
        setError(payload.message ?? 'Operazione non riuscita');
        return;
      }

      setSuccess('Stato scadenza aggiornato');
      refreshFleetAlertBadge();
    } finally {
      if (selectedVehicleId) {
        await loadVehicleDetail(selectedVehicleId);
      }
      setOccurrenceActionLoadingId((current) => (current === occurrenceId ? null : current));
    }
  }

  async function togglePlan(planId: number, active: boolean) {
    setError(null);
    setSuccess(null);

    const target = active ? 'deactivate' : 'reactivate';
    const response = await fetch(`/api/fleet/plans/${planId}/${target}`, { method: 'PATCH' });
    const payload = (await response.json().catch(() => ({}))) as { message?: string };

    if (!response.ok) {
      setError(payload.message ?? 'Operazione piano non riuscita');
      return;
    }

    setSuccess(active ? 'Piano disattivato' : 'Piano riattivato');
    refreshFleetAlertBadge();
    if (selectedVehicleId) {
      await loadVehicleDetail(selectedVehicleId);
    }
  }

  async function saveUnavailability(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedVehicleId) {
      return;
    }

    setError(null);
    setSuccess(null);

    const targetUrl = editingUnavailabilityId
      ? `/api/fleet/unavailabilities/${editingUnavailabilityId}`
      : `/api/fleet/vehicles/${selectedVehicleId}/unavailabilities`;

    const response = await fetch(targetUrl, {
      method: editingUnavailabilityId ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        startDate: unavailabilityForm.startDate,
        endDate: unavailabilityForm.endDate,
        reason: unavailabilityForm.reason
      })
    });

    const payload = (await response.json().catch(() => ({}))) as { message?: string };
    if (!response.ok) {
      setError(payload.message ?? 'Salvataggio manutenzione non riuscito');
      return;
    }

    setSuccess(editingUnavailabilityId ? 'Manutenzione aggiornata' : 'Manutenzione inserita');
    setEditingUnavailabilityId(null);
    setUnavailabilityForm(defaultUnavailabilityForm);
    setUnavailabilityModalOpen(false);
    await loadVehicleUnavailabilities(selectedVehicleId);
  }

  async function deleteUnavailability(unavailabilityId: number) {
    if (!selectedVehicleId) {
      return;
    }

    setError(null);
    setSuccess(null);

    const response = await fetch(`/api/fleet/unavailabilities/${unavailabilityId}`, { method: 'DELETE' });
    if (!response.ok) {
      const payload = (await response.json().catch(() => ({}))) as { message?: string };
      setError(payload.message ?? 'Eliminazione manutenzione non riuscita');
      return;
    }

    setSuccess('Manutenzione eliminata');
    if (editingUnavailabilityId === unavailabilityId) {
      setEditingUnavailabilityId(null);
      setUnavailabilityForm(defaultUnavailabilityForm);
      setUnavailabilityModalOpen(false);
    }
    await loadVehicleUnavailabilities(selectedVehicleId);
  }

  async function syncMissingOccurrences() {
    if (!isAdmin) {
      return;
    }

    setError(null);
    setSuccess(null);

    const response = await fetch('/api/fleet/plans/sync-missing-occurrences', {
      method: 'POST'
    });
    const payload = (await response.json().catch(() => ({}))) as {
      message?: string;
      plansScanned?: number;
      plansActive?: number;
      occurrencesCreated?: number;
      occurrencesAlreadyPresent?: number;
    };

    if (!response.ok) {
      setError(payload.message ?? 'Sync piani non riuscito');
      return;
    }

    setSuccess(
      `Sync completato: piani ${payload.plansScanned ?? 0}, attivi ${payload.plansActive ?? 0}, create ${payload.occurrencesCreated ?? 0}, già presenti ${payload.occurrencesAlreadyPresent ?? 0}`
    );
    refreshFleetAlertBadge();

    if (selectedVehicleId) {
      await loadVehicleDetail(selectedVehicleId);
    }
  }

  return (
    <section id="scadenze" className="responsive-panel fleet-management-panel" style={{ display: 'grid', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
        <div>
          <h1 style={{ margin: 0 }}>Gestione Flotta</h1>
          <p style={{ margin: '4px 0 0' }}>Gestione completa veicolo: anagrafica, scadenze/manutenzioni e piani ricorrenti.</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {isAdmin && (
            <button
              type="button"
              className="primary-button compact-button"
              onClick={syncMissingOccurrences}
            >
              <ButtonContent icon={<ResetIcon />}>Sync piani</ButtonContent>
            </button>
          )}
          <button
            type="button"
            className="primary-button compact-button"
            onClick={() => { setNewVehicleForm({ plate: '', seats: '', type: 'SEDAN', notes: '' }); setVehicleModal('create'); }}
          >
            <ButtonContent icon={<AddIcon />}>Nuovo veicolo</ButtonContent>
          </button>
        </div>
      </div>

      <FleetDeadlinesAlerts />

      {vehicleModal && (
        <div
          className="fleet-modal-overlay"
          onMouseDown={(e) => { if (e.target === e.currentTarget) setVehicleModal(null); }}
          onKeyDown={(e) => { if (e.key === 'Escape') setVehicleModal(null); }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="vehicle-modal-title"
          tabIndex={-1}
          ref={vehicleModalRef}
        >
          <div className="fleet-modal">
            <div className="fleet-modal-header">
              <h2 id="vehicle-modal-title">{vehicleModal === 'create' ? 'Nuovo veicolo' : 'Modifica veicolo'}</h2>
              <button type="button" className="fleet-modal-close" onClick={() => setVehicleModal(null)} aria-label="Chiudi">✕</button>
            </div>
            {vehicleModal === 'create' ? (
              <form className="form-grid" onSubmit={createVehicle}>
                <label>
                  Targa
                  <input className="form-input" value={newVehicleForm.plate} onChange={(e) => setNewVehicleForm((p) => ({ ...p, plate: e.target.value }))} required />
                </label>
                <label>
                  Posti
                  <input className="form-input" type="number" min={1} value={newVehicleForm.seats} onChange={(e) => setNewVehicleForm((p) => ({ ...p, seats: e.target.value }))} required />
                </label>
                <label>
                  Tipo
                  <select className="form-input" value={newVehicleForm.type} onChange={(e) => setNewVehicleForm((p) => ({ ...p, type: e.target.value as VehicleType }))}>
                    <option value="SEDAN">Sedan</option>
                    <option value="VAN">Van</option>
                    <option value="MINIBUS">Minibus</option>
                    <option value="SUV">Suv</option>
                    <option value="OTHER">Altro</option>
                  </select>
                </label>
                <label>
                  Note
                  <input className="form-input" value={newVehicleForm.notes} onChange={(e) => setNewVehicleForm((p) => ({ ...p, notes: e.target.value }))} />
                </label>
                <div className="form-actions fleet-form-actions" style={{ display: 'flex', gap: 8 }}>
                  <button type="submit" className="primary-button compact-button"><ButtonContent icon={<AddIcon />}>Crea veicolo</ButtonContent></button>
                  <button type="button" className="logout-button compact-button" onClick={() => setNewVehicleForm({ plate: '', seats: '', type: 'SEDAN', notes: '' })}><ButtonContent icon={<ResetIcon />}>Reset</ButtonContent></button>
                  <button type="button" className="logout-button compact-button" onClick={() => setVehicleModal(null)}><ButtonContent icon={<CancelIcon />}>Annulla</ButtonContent></button>
                </div>
              </form>
            ) : (
              <form className="form-grid" onSubmit={saveVehicle}>
                <label>
                  Targa
                  <input className="form-input" value={vehicleForm.plate} onChange={(e) => setVehicleForm((p) => ({ ...p, plate: e.target.value }))} required />
                </label>
                <label>
                  Posti
                  <input className="form-input" type="number" min={1} value={vehicleForm.seats} onChange={(e) => setVehicleForm((p) => ({ ...p, seats: e.target.value }))} required />
                </label>
                <label>
                  Tipo
                  <select className="form-input" value={vehicleForm.type} onChange={(e) => setVehicleForm((p) => ({ ...p, type: e.target.value as VehicleType }))}>
                    <option value="SEDAN">Sedan</option>
                    <option value="VAN">Van</option>
                    <option value="MINIBUS">Minibus</option>
                    <option value="SUV">Suv</option>
                    <option value="OTHER">Altro</option>
                  </select>
                </label>
                <label>
                  Note
                  <input className="form-input" value={vehicleForm.notes} onChange={(e) => setVehicleForm((p) => ({ ...p, notes: e.target.value }))} />
                </label>
                <div className="form-actions fleet-form-actions" style={{ display: 'flex', gap: 8 }}>
                  <button type="submit" className="primary-button compact-button"><ButtonContent icon={<SaveIcon />}>Salva</ButtonContent></button>
                  <button type="button" className="logout-button compact-button" onClick={() => {
                    const v = vehicles.find((item) => item.id === selectedVehicleId);
                    setVehicleForm({ plate: v?.plate ?? '', seats: v ? String(v.seats) : '', type: v?.type ?? 'SEDAN', notes: v?.notes ?? '' });
                  }}><ButtonContent icon={<ResetIcon />}>Reset</ButtonContent></button>
                  <button type="button" className="logout-button compact-button" onClick={() => setVehicleModal(null)}><ButtonContent icon={<CancelIcon />}>Annulla</ButtonContent></button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {occurrenceModalOpen && (
        <div
          className="fleet-modal-overlay"
          onMouseDown={(e) => { if (e.target === e.currentTarget) setOccurrenceModalOpen(false); }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="occurrence-modal-title"
        >
          <div className="fleet-modal">
            <div className="fleet-modal-header">
              <h2 id="occurrence-modal-title">{editingOccurrenceId ? 'Modifica scadenza' : 'Nuova scadenza'}</h2>
              <button type="button" className="fleet-modal-close" onClick={() => setOccurrenceModalOpen(false)} aria-label="Chiudi">✕</button>
            </div>
            <form className="form-grid" onSubmit={saveOccurrence}>
              <label>
                Piano (opzionale)
                <select
                  className="form-input"
                  value={occurrenceForm.planId}
                  onChange={(e) => setOccurrenceForm((p) => ({ ...p, planId: e.target.value ? Number(e.target.value) : '' }))}
                >
                  <option value="">Nessun piano</option>
                  {plans.map((plan) => (
                    <option key={plan.id} value={plan.id}>{plan.title}</option>
                  ))}
                </select>
              </label>
              <label>
                Tipo
                <select className="form-input" value={occurrenceForm.type} onChange={(e) => {
                  const newType = e.target.value as DeadlineType;
                  setOccurrenceForm((p) => ({
                    ...p,
                    type: newType,
                    status: sanitizeStatusForType(p.status, newType)
                  }));
                }}>
                  <option value="BOLLO">Bollo</option>
                  <option value="ASSICURAZIONE">Assicurazione</option>
                  <option value="REVISIONE">Revisione</option>
                  <option value="TAGLIANDO">Tagliando</option>
                  <option value="ALTRO">Altro</option>
                </select>
              </label>
              <label>
                Titolo
                <input className="form-input" value={occurrenceForm.title} onChange={(e) => setOccurrenceForm((p) => ({ ...p, title: e.target.value }))} required />
              </label>
              <label>
                Descrizione
                <input className="form-input" value={occurrenceForm.description} onChange={(e) => setOccurrenceForm((p) => ({ ...p, description: e.target.value }))} />
              </label>
              <label>
                Data scadenza
                <input className="form-input" type="date" value={occurrenceForm.dueDate} onChange={(e) => setOccurrenceForm((p) => ({ ...p, dueDate: e.target.value }))} required />
              </label>
              <label>
                Stato
                <select className="form-input" value={occurrenceForm.status} onChange={(e) => setOccurrenceForm((p) => ({ ...p, status: e.target.value as DeadlineStatus }))}>
                  {allowedStatusesForType(occurrenceForm.type).map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </label>
              <label>
                Costo
                <input className="form-input" type="number" min={0} step="0.01" value={occurrenceForm.cost} onChange={(e) => setOccurrenceForm((p) => ({ ...p, cost: e.target.value }))} required />
              </label>
              <label>
                Valuta
                <input className="form-input" maxLength={3} value={occurrenceForm.currency} onChange={(e) => setOccurrenceForm((p) => ({ ...p, currency: e.target.value.toUpperCase() }))} required />
              </label>
              <label>
                Data pagamento
                <input className="form-input" type="date" value={occurrenceForm.paymentDate} onChange={(e) => setOccurrenceForm((p) => ({ ...p, paymentDate: e.target.value }))} />
              </label>
              <label>
                Data esecuzione
                <input className="form-input" type="date" value={occurrenceForm.executionDate} onChange={(e) => setOccurrenceForm((p) => ({ ...p, executionDate: e.target.value }))} />
              </label>
              <label>
                Note
                <input className="form-input" value={occurrenceForm.notes} onChange={(e) => setOccurrenceForm((p) => ({ ...p, notes: e.target.value }))} />
              </label>
              <div className="form-actions fleet-form-actions" style={{ display: 'flex', gap: 8 }}>
                <button type="submit" className="primary-button compact-button"><ButtonContent icon={<SaveIcon />}>{editingOccurrenceId ? 'Aggiorna scadenza' : 'Crea scadenza'}</ButtonContent></button>
                <button
                  type="button"
                  className="logout-button compact-button"
                  onClick={() => {
                    setEditingOccurrenceId(null);
                    setOccurrenceForm(defaultOccurrenceForm);
                  }}
                >
                  <ButtonContent icon={<ResetIcon />}>Reset</ButtonContent>
                </button>
                <button type="button" className="logout-button compact-button" onClick={() => setOccurrenceModalOpen(false)}><ButtonContent icon={<CancelIcon />}>Annulla</ButtonContent></button>
              </div>
            </form>
          </div>
        </div>
      )}

      {planModalOpen && (
        <div
          className="fleet-modal-overlay"
          onMouseDown={(e) => { if (e.target === e.currentTarget) setPlanModalOpen(false); }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="plan-modal-title"
        >
          <div className="fleet-modal">
            <div className="fleet-modal-header">
              <h2 id="plan-modal-title">{editingPlanId ? 'Modifica piano ricorrente' : 'Nuovo piano ricorrente'}</h2>
              <button type="button" className="fleet-modal-close" onClick={() => setPlanModalOpen(false)} aria-label="Chiudi">✕</button>
            </div>
            <form className="form-grid" onSubmit={savePlan}>
              <label>
                Tipo
                <select className="form-input" value={planForm.type} onChange={(e) => setPlanForm((p) => ({ ...p, type: e.target.value as DeadlineType }))}>
                  <option value="BOLLO">Bollo</option>
                  <option value="ASSICURAZIONE">Assicurazione</option>
                  <option value="REVISIONE">Revisione</option>
                  <option value="TAGLIANDO">Tagliando</option>
                  <option value="ALTRO">Altro</option>
                </select>
              </label>
              <label>
                Titolo
                <input className="form-input" value={planForm.title} onChange={(e) => setPlanForm((p) => ({ ...p, title: e.target.value }))} required />
              </label>
              <label>
                Descrizione
                <input className="form-input" value={planForm.description} onChange={(e) => setPlanForm((p) => ({ ...p, description: e.target.value }))} />
              </label>
              <label>
                Ricorrenza (mesi)
                <input className="form-input" type="number" min={1} max={60} value={planForm.recurrenceMonths} onChange={(e) => setPlanForm((p) => ({ ...p, recurrenceMonths: e.target.value }))} required />
              </label>
              <label>
                Prossima scadenza
                <input className="form-input" type="date" value={planForm.nextDueDate} onChange={(e) => setPlanForm((p) => ({ ...p, nextDueDate: e.target.value }))} required />
              </label>
              <label>
                Costo standard
                <input className="form-input" type="number" min={0} step="0.01" value={planForm.standardCost} onChange={(e) => setPlanForm((p) => ({ ...p, standardCost: e.target.value }))} required />
              </label>
              <label>
                Valuta
                <input className="form-input" maxLength={3} value={planForm.currency} onChange={(e) => setPlanForm((p) => ({ ...p, currency: e.target.value.toUpperCase() }))} required />
              </label>
              <label>
                Note
                <input className="form-input" value={planForm.notes} onChange={(e) => setPlanForm((p) => ({ ...p, notes: e.target.value }))} />
              </label>
              <div className="form-actions fleet-form-actions" style={{ display: 'flex', gap: 8 }}>
                <button type="submit" className="primary-button compact-button"><ButtonContent icon={<SaveIcon />}>{editingPlanId ? 'Aggiorna piano' : 'Crea piano'}</ButtonContent></button>
                <button
                  type="button"
                  className="logout-button compact-button"
                  onClick={() => {
                    setEditingPlanId(null);
                    setPlanForm(defaultPlanForm);
                  }}
                >
                  <ButtonContent icon={<ResetIcon />}>Reset</ButtonContent>
                </button>
                <button type="button" className="logout-button compact-button" onClick={() => setPlanModalOpen(false)}><ButtonContent icon={<CancelIcon />}>Annulla</ButtonContent></button>
              </div>
            </form>
          </div>
        </div>
      )}

      {unavailabilityModalOpen && (
        <div
          className="fleet-modal-overlay"
          onMouseDown={(e) => { if (e.target === e.currentTarget) setUnavailabilityModalOpen(false); }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="unavailability-modal-title"
        >
          <div className="fleet-modal">
            <div className="fleet-modal-header">
              <h2 id="unavailability-modal-title">{editingUnavailabilityId ? 'Modifica manutenzione' : 'Nuova manutenzione'}</h2>
              <button type="button" className="fleet-modal-close" onClick={() => setUnavailabilityModalOpen(false)} aria-label="Chiudi">✕</button>
            </div>
            <form className="form-grid" onSubmit={saveUnavailability}>
              <label>
                Dal giorno
                <input
                  className="form-input"
                  type="date"
                  value={unavailabilityForm.startDate}
                  onChange={(event) => setUnavailabilityForm((prev) => ({ ...prev, startDate: event.target.value }))}
                  required
                />
              </label>
              <label>
                Al giorno
                <input
                  className="form-input"
                  type="date"
                  value={unavailabilityForm.endDate}
                  onChange={(event) => setUnavailabilityForm((prev) => ({ ...prev, endDate: event.target.value }))}
                  required
                />
              </label>
              <label>
                Motivo guasto/manutenzione
                <input
                  className="form-input"
                  value={unavailabilityForm.reason}
                  onChange={(event) => setUnavailabilityForm((prev) => ({ ...prev, reason: event.target.value }))}
                  required
                />
              </label>
              <div className="form-actions fleet-form-actions" style={{ display: 'flex', gap: 8 }}>
                <button type="submit" className="primary-button compact-button">
                  <ButtonContent icon={<SaveIcon />}>{editingUnavailabilityId ? 'Aggiorna manutenzione' : 'Salva manutenzione'}</ButtonContent>
                </button>
                <button
                  type="button"
                  className="logout-button compact-button"
                  onClick={() => {
                    setEditingUnavailabilityId(null);
                    setUnavailabilityForm(defaultUnavailabilityForm);
                  }}
                >
                  <ButtonContent icon={<ResetIcon />}>Reset</ButtonContent>
                </button>
                <button type="button" className="logout-button compact-button" onClick={() => setUnavailabilityModalOpen(false)}><ButtonContent icon={<CancelIcon />}>Annulla</ButtonContent></button>
              </div>
            </form>
          </div>
        </div>
      )}

      <article className="dashboard-card services-filters-card">
        <button
          type="button"
          className="services-filters-label"
          onClick={() => setVehicleFiltersOpen((prev) => !prev)}
          aria-expanded={vehicleFiltersOpen}
          aria-controls="fleet-filters-grid"
        >
          <ButtonContent icon={vehicleFiltersOpen ? <LockIcon /> : <FilterIcon />}>
            {vehicleFiltersOpen ? 'Nascondi filtri' : 'Mostra filtri'}
          </ButtonContent>
        </button>

        <div
          id="fleet-filters-grid"
          className={`services-filters-panel services-filters-grid ${vehicleFiltersOpen ? '' : 'is-hidden-mobile'}`}
        >
          <div className="services-filters-row">
            <label className="services-filter-group">
              <span className="services-filter-label">Targa</span>
              <input
                className="services-filter-input"
                value={plateFilter}
                onChange={(event) => setPlateFilter(event.target.value)}
                placeholder="Es. RO-TR"
              />
            </label>

            <FilterDropdown
              className="services-filter-group--type"
              label="Tipo"
              value={typeFilter}
              options={[
                { value: 'ALL', label: 'Tutti' },
                { value: 'SEDAN', label: 'Sedan' },
                { value: 'VAN', label: 'Van' },
                { value: 'MINIBUS', label: 'Minibus' },
                { value: 'SUV', label: 'Suv' },
                { value: 'OTHER', label: 'Altro' },
              ]}
              onChange={(v) => setTypeFilter(v as 'ALL' | VehicleType)}
            />

            <label className="services-filter-group">
              <span className="services-filter-label">Numero posti</span>
              <input
                className="services-filter-input"
                type="number"
                min={1}
                value={seatsFilter}
                onChange={(event) => setSeatsFilter(event.target.value)}
                placeholder="Es. 4"
              />
            </label>
          </div>

          {activeVehicleFilterChips.length > 0 && (
            <div className="services-active-filters-row">
              <span className="services-active-filters-label">Filtri attivi:</span>
              <div className="services-active-chips">
                {activeVehicleFilterChips.map((chip) => (
                  <span key={chip.key} className="services-active-chip">
                    <span className="services-active-chip-icon" aria-hidden="true"><FilterIcon /></span>
                    {chip.label}
                    <button
                      type="button"
                      className="services-active-chip-remove"
                      onClick={chip.onRemove}
                      aria-label={`Rimuovi filtro ${chip.label}`}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
              <button
                type="button"
                className="services-reset-link"
                onClick={resetVehicleFilters}
              >
                Reset filtri
              </button>
            </div>
          )}
        </div>
      </article>

      <article className="dashboard-card">
            <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
              <h3>Lista veicoli</h3>
            </div>

            <div className="table-scroll services-desktop-table" style={{ overflowX: 'auto', marginTop: 8 }}>
              <table className="responsive-table services-table services-table-modern" style={{ width: '100%', minWidth: 860, borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', padding: '0 10px 8px 0' }}>Targa</th>
                    <th style={{ textAlign: 'left', padding: '0 10px 8px 0' }}>Posti</th>
                    <th style={{ textAlign: 'left', padding: '0 10px 8px 0' }}>Tipo</th>
                    <th style={{ textAlign: 'left', padding: '0 10px 8px 0' }}>Note</th>
                    <th style={{ textAlign: 'left', padding: '0 10px 8px 0' }}>Azioni</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredVehicles.length === 0 ? (
                    <tr>
                      <td style={{ padding: '8px 10px 8px 0', borderBottom: '1px solid #eaf1f9' }} colSpan={5}>
                        {vehicles.length === 0 ? 'Nessun veicolo presente.' : 'Nessun veicolo corrisponde ai filtri.'}
                      </td>
                    </tr>
                  ) : (
                    filteredVehicles.map((vehicle) => (
                      <tr
                        key={vehicle.id}
                        className={`services-table-row ${selectedVehicleId === vehicle.id ? 'is-selected' : ''}`}
                        aria-current={selectedVehicleId === vehicle.id ? 'true' : undefined}
                      >
                        <td style={{ padding: '8px 10px 8px 0', borderBottom: '1px solid #eaf1f9' }}>{vehicle.plate}</td>
                        <td style={{ padding: '8px 10px 8px 0', borderBottom: '1px solid #eaf1f9' }}>{vehicle.seats}</td>
                        <td style={{ padding: '8px 10px 8px 0', borderBottom: '1px solid #eaf1f9' }}>{vehicleTypeLabel(vehicle.type)}</td>
                        <td style={{ padding: '8px 10px 8px 0', borderBottom: '1px solid #eaf1f9' }}>{vehicle.notes ?? '-'}</td>
                        <td style={{ padding: '8px 10px 8px 0', borderBottom: '1px solid #eaf1f9' }}>
                          <div className="table-actions" style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            <button type="button" className="primary-button compact-button" onClick={() => editVehicle(vehicle)}>
                              <ButtonContent icon={<EditIcon />}>Modifica</ButtonContent>
                            </button>
                            <button
                              type="button"
                              className="logout-button"
                              onClick={() => selectVehicle(vehicle.id)}
                              disabled={selectedVehicleId === vehicle.id}
                            >
                              <ButtonContent icon={<SelectIcon />}>{selectedVehicleId === vehicle.id ? 'Selezionato' : 'Seleziona'}</ButtonContent>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="services-mobile-list" style={{ marginTop: 8 }}>
              {filteredVehicles.length === 0 ? (
                <article className="service-mobile-card">
                  <div className="service-mobile-meta">
                    <span>{vehicles.length === 0 ? 'Nessun veicolo presente.' : 'Nessun veicolo corrisponde ai filtri.'}</span>
                  </div>
                </article>
              ) : (
                filteredVehicles.map((vehicle) => (
                  <article
                    key={vehicle.id}
                    className={`service-mobile-card ${selectedVehicleId === vehicle.id ? 'is-selected' : ''}`}
                  >
                    <div className="service-mobile-card-top">
                      <div className="service-mobile-badges">
                        <span className="service-chip service-chip-type">{vehicleTypeLabel(vehicle.type)}</span>
                      </div>
                      <strong className="service-mobile-price">{vehicle.seats} posti</strong>
                    </div>

                    <div className="service-mobile-meta">
                      <span>Targa: {vehicle.plate}</span>
                    </div>
                    <div className="service-mobile-meta">
                      <span>Note: {vehicle.notes ?? '-'}</span>
                    </div>

                    <div className="service-mobile-actions">
                      <button type="button" className="primary-button compact-button" onClick={() => editVehicle(vehicle)}>
                        <ButtonContent icon={<EditIcon />}>Modifica</ButtonContent>
                      </button>
                      <button
                        type="button"
                        className="logout-button compact-button"
                        onClick={() => selectVehicle(vehicle.id)}
                        disabled={selectedVehicleId === vehicle.id}
                      >
                        <ButtonContent icon={<SelectIcon />}>{selectedVehicleId === vehicle.id ? 'Selezionato' : 'Seleziona'}</ButtonContent>
                      </button>
                    </div>
                  </article>
                ))
              )}
            </div>

      </article>

      {!selectedVehicleId ? (
        <article className="dashboard-card"><p>Nessun veicolo selezionato. Usa il pulsante &quot;Seleziona&quot; nella lista veicoli.</p></article>
      ) : loading ? (
        <article className="dashboard-card"><p>Caricamento dettaglio veicolo...</p></article>
      ) : !detail ? (
        <article className="dashboard-card"><p>Dettaglio veicolo non disponibile.</p></article>
      ) : (
        <>
          <article className="dashboard-card">
            <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
              <h3>Storico scadenze</h3>
              <button
                type="button"
                className="primary-button compact-button"
                onClick={openOccurrenceCreateModal}
              >
                <ButtonContent icon={<AddIcon />}>Aggiungi scadenza</ButtonContent>
              </button>
            </div>

            <div className="table-scroll services-desktop-table" style={{ overflowX: 'auto', marginTop: 8 }}>
              <table className="responsive-table services-table services-table-modern" style={{ width: '100%', minWidth: 980, borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', padding: '0 10px 8px 0' }}>Tipo</th>
                    <th style={{ textAlign: 'left', padding: '0 10px 8px 0' }}>Titolo</th>
                    <th style={{ textAlign: 'left', padding: '0 10px 8px 0' }}>Data</th>
                    <th style={{ textAlign: 'left', padding: '0 10px 8px 0' }}>Stato</th>
                    <th style={{ textAlign: 'left', padding: '0 10px 8px 0' }}>Costo</th>
                    <th style={{ textAlign: 'left', padding: '0 10px 8px 0' }}>Azioni</th>
                  </tr>
                </thead>
                <tbody>
                  {occurrences.map((item) => (
                    <tr key={item.id} className="services-table-row">
                      {(() => {
                        const overdue = isOverdueStatus(item.status);
                        const dueSoon = !overdue && isDueSoonStatus(item.status, item.dueDate);
                        const highlightClass = overdue ? 'error-text' : dueSoon ? 'warning-text' : undefined;

                        return (
                          <>
                        <td style={{ padding: '8px 10px 8px 0', borderBottom: '1px solid #eaf1f9' }}>{typeLabel(item.type)}</td>
                        <td style={{ padding: '8px 10px 8px 0', borderBottom: '1px solid #eaf1f9' }}>{item.title}</td>
                        <td style={{ padding: '8px 10px 8px 0', borderBottom: '1px solid #eaf1f9' }}>
                          <span className={highlightClass}>{item.dueDate}</span>
                        </td>
                        <td style={{ padding: '8px 10px 8px 0', borderBottom: '1px solid #eaf1f9' }}>
                          <span className={highlightClass}>{statusLabel(item.status)}</span>
                        </td>
                        <td style={{ padding: '8px 10px 8px 0', borderBottom: '1px solid #eaf1f9' }}>{item.cost} {item.currency}</td>
                        <td style={{ padding: '8px 10px 8px 0', borderBottom: '1px solid #eaf1f9' }}>
                          <div className="table-actions" style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            <button type="button" className="primary-button compact-button" onClick={() => openOccurrenceEditModal(item)}><ButtonContent icon={<EditIcon />}>Modifica</ButtonContent></button>

                            {(item.type === 'BOLLO' || item.type === 'ASSICURAZIONE') ? (
                              <button
                                type="button"
                                className="logout-button"
                                onClick={() => quickOccurrenceAction(item.id, 'paid')}
                                disabled={!canMarkOccurrenceAsPaid(item) || occurrenceActionLoadingId === item.id}
                              >
                                <ButtonContent icon={<SaveIcon />}>Segna pagata</ButtonContent>
                              </button>
                            ) : (
                              <button
                                type="button"
                                className="logout-button"
                                onClick={() => quickOccurrenceAction(item.id, 'completed')}
                                disabled={!canMarkOccurrenceAsCompleted(item) || occurrenceActionLoadingId === item.id}
                              >
                                <ButtonContent icon={<SaveIcon />}>Segna eseguita</ButtonContent>
                              </button>
                            )}
                            <button
                              type="button"
                              className="logout-button"
                              onClick={() => quickOccurrenceAction(item.id, 'cancel')}
                              disabled={!canCancelOccurrence(item) || occurrenceActionLoadingId === item.id}
                            >
                              <ButtonContent icon={<CancelIcon />}>Annulla</ButtonContent>
                            </button>
                          </div>
                        </td>
                          </>
                        );
                      })()}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="services-mobile-list" style={{ marginTop: 8 }}>
              {occurrences.length === 0 ? (
                <article className="service-mobile-card">
                  <div className="service-mobile-meta">
                    <span>Nessuna scadenza registrata.</span>
                  </div>
                </article>
              ) : (
                occurrences.map((item) => {
                  const overdue = isOverdueStatus(item.status);
                  const dueSoon = !overdue && isDueSoonStatus(item.status, item.dueDate);
                  const highlightClass = overdue ? 'error-text' : dueSoon ? 'warning-text' : undefined;

                  return (
                    <article key={item.id} className="service-mobile-card">
                      <div className="service-mobile-card-top">
                        <div className="service-mobile-badges">
                          <span className="service-chip service-chip-type">{typeLabel(item.type)}</span>
                          <span className="service-chip service-chip-type-neutral">{statusLabel(item.status)}</span>
                        </div>
                        <strong className="service-mobile-price">{item.cost} {item.currency}</strong>
                      </div>

                      <div className="service-mobile-meta">
                        <span>{item.title}</span>
                      </div>
                      <div className="service-mobile-meta">
                        <span className={highlightClass}>Scadenza: {item.dueDate}</span>
                      </div>

                      <div className="service-mobile-actions">
                        <button type="button" className="primary-button compact-button" onClick={() => openOccurrenceEditModal(item)}><ButtonContent icon={<EditIcon />}>Modifica</ButtonContent></button>

                        {(item.type === 'BOLLO' || item.type === 'ASSICURAZIONE') ? (
                          <button
                            type="button"
                            className="logout-button compact-button"
                            onClick={() => quickOccurrenceAction(item.id, 'paid')}
                            disabled={!canMarkOccurrenceAsPaid(item) || occurrenceActionLoadingId === item.id}
                          >
                            <ButtonContent icon={<SaveIcon />}>Segna pagata</ButtonContent>
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="logout-button compact-button"
                            onClick={() => quickOccurrenceAction(item.id, 'completed')}
                            disabled={!canMarkOccurrenceAsCompleted(item) || occurrenceActionLoadingId === item.id}
                          >
                            <ButtonContent icon={<SaveIcon />}>Segna eseguita</ButtonContent>
                          </button>
                        )}

                        <button
                          type="button"
                          className="logout-button compact-button"
                          onClick={() => quickOccurrenceAction(item.id, 'cancel')}
                          disabled={!canCancelOccurrence(item) || occurrenceActionLoadingId === item.id}
                        >
                          <ButtonContent icon={<CancelIcon />}>Annulla</ButtonContent>
                        </button>
                      </div>
                    </article>
                  );
                })
              )}
            </div>
          </article>

          <article className="dashboard-card">
            <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
              <h3>Piani ricorrenti</h3>
              <button type="button" className="primary-button compact-button" onClick={openPlanCreateModal}><ButtonContent icon={<AddIcon />}>Aggiungi piano ricorrente</ButtonContent></button>
            </div>

            <div className="table-scroll services-desktop-table" style={{ overflowX: 'auto', marginTop: 8 }}>
              <table className="responsive-table services-table services-table-modern" style={{ width: '100%', minWidth: 980, borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', padding: '0 10px 8px 0' }}>Tipo</th>
                    <th style={{ textAlign: 'left', padding: '0 10px 8px 0' }}>Titolo</th>
                    <th style={{ textAlign: 'left', padding: '0 10px 8px 0' }}>Ricorrenza</th>
                    <th style={{ textAlign: 'left', padding: '0 10px 8px 0' }}>Prossima scadenza</th>
                    <th style={{ textAlign: 'left', padding: '0 10px 8px 0' }}>Costo</th>
                    <th style={{ textAlign: 'left', padding: '0 10px 8px 0' }}>Attivo</th>
                    <th style={{ textAlign: 'left', padding: '0 10px 8px 0' }}>Azioni</th>
                  </tr>
                </thead>
                <tbody>
                  {plans.length === 0 ? (
                    <tr>
                      <td style={{ padding: '8px 10px 8px 0', borderBottom: '1px solid #eaf1f9' }} colSpan={7}>
                        Nessun piano registrato.
                      </td>
                    </tr>
                  ) : (
                    plans.map((item) => (
                      <tr key={item.id} className="services-table-row">
                        <td style={{ padding: '8px 10px 8px 0', borderBottom: '1px solid #eaf1f9' }}>{typeLabel(item.type)}</td>
                        <td style={{ padding: '8px 10px 8px 0', borderBottom: '1px solid #eaf1f9' }}>{item.title}</td>
                        <td style={{ padding: '8px 10px 8px 0', borderBottom: '1px solid #eaf1f9' }}>{item.recurrenceMonths} mesi</td>
                        <td style={{ padding: '8px 10px 8px 0', borderBottom: '1px solid #eaf1f9' }}>{item.nextDueDate}</td>
                        <td style={{ padding: '8px 10px 8px 0', borderBottom: '1px solid #eaf1f9' }}>{item.standardCost} {item.currency}</td>
                        <td style={{ padding: '8px 10px 8px 0', borderBottom: '1px solid #eaf1f9' }}>{item.active ? 'Attivo' : 'Inattivo'}</td>
                        <td style={{ padding: '8px 10px 8px 0', borderBottom: '1px solid #eaf1f9' }}>
                          <div className="table-actions" style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            <button type="button" className="primary-button compact-button" onClick={() => openPlanEditModal(item)}><ButtonContent icon={<EditIcon />}>Modifica</ButtonContent></button>
                            <button
                              type="button"
                              className="logout-button"
                              onClick={() => togglePlan(item.id, item.active)}
                            >
                              <ButtonContent icon={<ResetIcon />}>{item.active ? 'Disattiva piano' : 'Riattiva piano'}</ButtonContent>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="services-mobile-list" style={{ marginTop: 8 }}>
              {plans.length === 0 ? (
                <article className="service-mobile-card">
                  <div className="service-mobile-meta">
                    <span>Nessun piano registrato.</span>
                  </div>
                </article>
              ) : (
                plans.map((item) => (
                  <article key={item.id} className="service-mobile-card">
                    <div className="service-mobile-card-top">
                      <div className="service-mobile-badges">
                        <span className="service-chip service-chip-type">{typeLabel(item.type)}</span>
                        <span className="service-chip service-chip-type-neutral">{item.active ? 'Attivo' : 'Inattivo'}</span>
                      </div>
                      <strong className="service-mobile-price">{item.standardCost} {item.currency}</strong>
                    </div>

                    <div className="service-mobile-meta">
                      <span>{item.title}</span>
                      <span>{item.recurrenceMonths} mesi</span>
                    </div>
                    <div className="service-mobile-meta">
                      <span>Prossima scadenza: {item.nextDueDate}</span>
                    </div>

                    <div className="service-mobile-actions">
                      <button type="button" className="primary-button compact-button" onClick={() => openPlanEditModal(item)}><ButtonContent icon={<EditIcon />}>Modifica</ButtonContent></button>
                      <button
                        type="button"
                        className="logout-button compact-button"
                        onClick={() => togglePlan(item.id, item.active)}
                      >
                        <ButtonContent icon={<ResetIcon />}>{item.active ? 'Disattiva piano' : 'Riattiva piano'}</ButtonContent>
                      </button>
                    </div>
                  </article>
                ))
              )}
            </div>
          </article>

          <article className="dashboard-card">
            <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
              <h3>Manutenzioni e indisponibilità</h3>
              <button
                type="button"
                className="primary-button compact-button"
                onClick={openUnavailabilityCreateModal}
              >
                <ButtonContent icon={<AddIcon />}>Nuova manutenzione</ButtonContent>
              </button>
            </div>

            <div className="table-scroll services-desktop-table" style={{ overflowX: 'auto', marginTop: 8 }}>
              <table className="responsive-table services-table services-table-modern" style={{ width: '100%', minWidth: 760, borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', padding: '0 10px 8px 0' }}>Inizio</th>
                    <th style={{ textAlign: 'left', padding: '0 10px 8px 0' }}>Fine</th>
                    <th style={{ textAlign: 'left', padding: '0 10px 8px 0' }}>Motivo</th>
                    <th style={{ textAlign: 'left', padding: '0 10px 8px 0' }}>Azioni</th>
                  </tr>
                </thead>
                <tbody>
                  {unavailabilities.length === 0 ? (
                    <tr>
                      <td style={{ padding: '8px 10px 8px 0', borderBottom: '1px solid #eaf1f9' }} colSpan={4}>
                        Nessuna manutenzione registrata.
                      </td>
                    </tr>
                  ) : (
                    unavailabilities.map((item) => (
                      <tr key={item.id} className="services-table-row">
                        <td style={{ padding: '8px 10px 8px 0', borderBottom: '1px solid #eaf1f9' }}>{item.startDate}</td>
                        <td style={{ padding: '8px 10px 8px 0', borderBottom: '1px solid #eaf1f9' }}>{item.endDate}</td>
                        <td style={{ padding: '8px 10px 8px 0', borderBottom: '1px solid #eaf1f9' }}>{item.reason}</td>
                        <td style={{ padding: '8px 10px 8px 0', borderBottom: '1px solid #eaf1f9' }}>
                          <div className="table-actions" style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            <button
                              type="button"
                              className="primary-button compact-button"
                              onClick={() => openUnavailabilityEditModal(item)}
                            >
                              <ButtonContent icon={<EditIcon />}>Modifica</ButtonContent>
                            </button>
                            <button
                              type="button"
                              className="logout-button"
                              onClick={() => deleteUnavailability(item.id)}
                            >
                              <ButtonContent icon={<DeleteIcon />}>Elimina</ButtonContent>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="services-mobile-list" style={{ marginTop: 8 }}>
              {unavailabilities.length === 0 ? (
                <article className="service-mobile-card">
                  <div className="service-mobile-meta">
                    <span>Nessuna manutenzione registrata.</span>
                  </div>
                </article>
              ) : (
                unavailabilities.map((item) => (
                  <article key={item.id} className="service-mobile-card">
                    <div className="service-mobile-card-top">
                      <div className="service-mobile-badges">
                        <span className="service-chip service-chip-type">Manutenzione</span>
                      </div>
                      <strong className="service-mobile-price">{item.startDate}</strong>
                    </div>

                    <div className="service-mobile-meta">
                      <span>Dal: {item.startDate}</span>
                      <span>Al: {item.endDate}</span>
                    </div>
                    <div className="service-mobile-meta">
                      <span>{item.reason}</span>
                    </div>

                    <div className="service-mobile-actions">
                      <button
                        type="button"
                        className="primary-button compact-button"
                        onClick={() => openUnavailabilityEditModal(item)}
                      >
                        <ButtonContent icon={<EditIcon />}>Modifica</ButtonContent>
                      </button>
                      <button
                        type="button"
                        className="logout-button compact-button"
                        onClick={() => deleteUnavailability(item.id)}
                      >
                        <ButtonContent icon={<DeleteIcon />}>Elimina</ButtonContent>
                      </button>
                    </div>
                  </article>
                ))
              )}
            </div>
          </article>
        </>
      )}

      {error && <StatusNotice tone="error">{error}</StatusNotice>}
      {success && <StatusNotice tone="success">{success}</StatusNotice>}
    </section>
  );
}
