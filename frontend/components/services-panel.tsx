"use client";

import { FormEvent, ReactNode, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { AddIcon, ArrowLeftIcon, ArrowRightIcon, ButtonContent, CancelIcon, CursorIcon, LockIcon, OpenIcon, PartnerIcon as SharedPartnerIcon, PrintIcon as SharedPrintIcon, ResetIcon, SaveIcon, SelectIcon } from './action-icons';
import { formatCurrencyEUR } from '../lib/currency';

type ServiceType = 'TRANSFER' | 'TOUR';
type ServiceStatus = 'OPEN' | 'ASSIGNED' | 'EXECUTED' | 'CLOSED';
type ServiceAssignmentType = 'INTERNAL' | 'OUTSOURCED' | 'INCOMING';

type ServiceItem = {
  id: number;
  startAt: string;
  pickupLocation: string;
  destination: string;
  type: ServiceType;
  durationHours: number | null;
  notes: string | null;
  price: number | null;
  externalBookingReference: number | null;
  internalBookingReference: string | null;
  clientName: string | null;
  clientPhone: string | null;
  clientEmail: string | null;
  passengersCount: number | null;
  itinerary: string | null;
  status: ServiceStatus;
  assignedDriverId: number | null;
  assignedVehicleId: number | null;
  assignedByUserId: number | null;
  assignedAt: string | null;
  serviceAssignmentType: ServiceAssignmentType;
  partnerId: number | null;
  pricePartner: number | null;
  margin: number | null;
  createdAt: string;
  updatedAt: string;
};

type PartnerItem = {
  id: number;
  ragioneSociale: string;
  deleted: boolean;
};

type ServicePartnerCommunicationItem = {
  communicationId: number;
  channel: string;
  recipient: string;
  subject: string;
  createdAt: string;
};

type ServicePartnerHistoryItem = {
  serviceId: number;
  serviceAssignmentType: ServiceAssignmentType;
  partnerId: number;
  partnerRagioneSociale: string | null;
  partnerEmail: string | null;
  pricePartner: number | null;
  margin: number | null;
  communications: ServicePartnerCommunicationItem[];
};

type DriverItem = {
  id: number;
  userId: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  role: string;
  enabled: boolean;
  createdAt: string;
};

type ServiceFormState = {
  startAt: string;
  pickupLocation: string;
  destination: string;
  type: ServiceType;
  durationHours: string;
  notes: string;
  price: string;
  externalBookingReference: string;
  internalBookingReference: string;
  clientName: string;
  clientPhone: string;
  clientEmail: string;
  passengersCount: string;
  itinerary: string;
  serviceAssignmentType: ServiceAssignmentType;
  partnerId: number | '';
  pricePartner: string;
  receivedFromPartner: boolean;
  assignedDriverId: number | '';
  assignedVehicleId: number | '';
};

type VehicleItem = {
  id: number;
  plate: string;
  seats: number;
  type: string;
  notes: string | null;
};

type ServicesFilterState = {
  status: ServiceStatus | '';
  driverId: number | '';
  fromDate: string;
  toDate: string;
  onlyUnassigned: boolean;
};

const defaultForm: ServiceFormState = {
  startAt: '',
  pickupLocation: '',
  destination: '',
  type: 'TRANSFER',
  durationHours: '',
  notes: '',
  price: '',
  externalBookingReference: '',
  internalBookingReference: '',
  clientName: '',
  clientPhone: '',
  clientEmail: '',
  passengersCount: '',
  itinerary: '',
  serviceAssignmentType: 'INTERNAL',
  partnerId: '',
  pricePartner: '',
  receivedFromPartner: false,
  assignedDriverId: '',
  assignedVehicleId: ''
};

const vehicleDayConflictMessage = 'Il veicolo risulta già assegnato ad un altro servizio nella stessa giornata';
const vehicleMaintenanceConflictMessage = 'Il veicolo risulta in manutenzione nella giornata del servizio';

const defaultFilters: ServicesFilterState = {
  status: '',
  driverId: '',
  fromDate: '',
  toDate: '',
  onlyUnassigned: false
};

function MobileClockIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 7.5v5l3.3 2" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function MobilePinIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        d="M12 21s6-5.7 6-10a6 6 0 1 0-12 0c0 4.3 6 10 6 10Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="11" r="2" fill="none" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function MobileArrowRightIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M5 12h13" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="m13 7 5 5-5 5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function DetailUserIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <circle cx="12" cy="8" r="3" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M5.5 19c1.4-3.2 4-4.8 6.5-4.8s5.1 1.6 6.5 4.8" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function DetailCarIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M6.5 14.5h11l-1.1-3.1a1.8 1.8 0 0 0-1.7-1.2H9.3a1.8 1.8 0 0 0-1.7 1.2Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M4.8 16.2c0-1 .8-1.7 1.7-1.7h11c1 0 1.7.8 1.7 1.7v2.2H4.8Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <circle cx="7.8" cy="18.4" r="1" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="16.2" cy="18.4" r="1" fill="none" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function DetailEuroIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M16.5 7.6a5.6 5.6 0 0 0-3.5-1.1c-2.8 0-4.9 1.7-5.5 4.1" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M16.5 16.4a5.6 5.6 0 0 1-3.5 1.1c-2.8 0-4.9-1.7-5.5-4.1" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M5.7 10.7h7.5M5.7 13.3h7.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function DetailDocumentIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M8 4.8h6.8l3.2 3.2v10.6A1.6 1.6 0 0 1 16.4 20H8a1.6 1.6 0 0 1-1.6-1.6V6.4A1.6 1.6 0 0 1 8 4.8Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M14.8 4.8V8H18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M9.2 11.2h5.6M9.2 14.2h5.6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function DetailPhoneIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M7 4.8h10a1.5 1.5 0 0 1 1.5 1.5v11.4a1.5 1.5 0 0 1-1.5 1.5H7a1.5 1.5 0 0 1-1.5-1.5V6.3A1.5 1.5 0 0 1 7 4.8Z" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M10 7h4M11 17.2h2" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function DetailMailIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <rect x="4.8" y="6.2" width="14.4" height="11.6" rx="1.6" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="m6.4 8 5.6 4.6L17.6 8" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  );
}

function ServiceDetailRow({ icon, label, value }: { icon: ReactNode; label: string; value: ReactNode }) {
  return (
    <div className="services-selected-row">
      <span className="services-selected-icon">{icon}</span>
      <span className="services-selected-label">{label}</span>
      <span className="services-selected-value">{value}</span>
    </div>
  );
}

function ActionEditIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="m5 16.8 9.9-9.9 3.2 3.2-9.9 9.9L5 20Z" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinejoin="round" />
      <path d="m13.8 8 3.2 3.2" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
    </svg>
  );
}

function ActionDeleteIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M5.8 7.4h12.4" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
      <path d="M9.4 7.4V5.7h5.2v1.7" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinejoin="round" />
      <path d="M8 7.4l.8 10.1h6.4L16 7.4" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinejoin="round" />
      <path d="M10.5 10.2v4.8M13.5 10.2v4.8" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
    </svg>
  );
}

function ActionLockIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <rect x="6.3" y="10.6" width="11.4" height="8.2" rx="1.7" fill="none" stroke="currentColor" strokeWidth="1.9" />
      <path d="M8.8 10.6V8.5A3.2 3.2 0 0 1 12 5.3a3.2 3.2 0 0 1 3.2 3.2v2.1" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
    </svg>
  );
}

function ActionHandshakeIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="m7 12.4 3.2 2.8a2 2 0 0 0 2.7-.1l4.3-4.1" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
      <path d="m3.8 11.3 2.6-2.5a2 2 0 0 1 2.7 0l2 1.8" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
      <path d="m20.2 11.3-2.6-2.5a2 2 0 0 0-2.7 0l-2 1.8" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
      <path d="m7.1 14.8-1.8 1.8m3 1.1-1.6 1.6m3-.3-1.5 1.5m3.1-1.2-1.3 1.3" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
    </svg>
  );
}

function ActionPrintIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M7.1 9.4V5.7h9.8v3.7" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinejoin="round" />
      <rect x="6.1" y="13" width="11.8" height="5.4" rx="1.2" fill="none" stroke="currentColor" strokeWidth="1.9" />
      <rect x="4.8" y="9.4" width="14.4" height="5.3" rx="1.4" fill="none" stroke="currentColor" strokeWidth="1.9" />
    </svg>
  );
}

function ActionDeselectIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="m6 5 10 7-4 1.2L13.6 19 11 20l-1.6-5.8L6 5Z" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinejoin="round" />
    </svg>
  );
}

export function ServicesPanel() {
  function driverLabel(driver: DriverItem) {
    const fullName = [driver.firstName, driver.lastName].filter(Boolean).join(' ').trim();
    if (fullName) {
      return fullName;
    }
    return driver.email;
  }

  const PAGE_SIZE = 10;
  const searchParams = useSearchParams();

  const [services, setServices] = useState<ServiceItem[]>([]);
  const [drivers, setDrivers] = useState<DriverItem[]>([]);
  const [vehicles, setVehicles] = useState<VehicleItem[]>([]);
  const [partners, setPartners] = useState<PartnerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingInitialStatus, setEditingInitialStatus] = useState<Exclude<ServiceStatus, 'CLOSED' | 'EXECUTED'>>('OPEN');
  const [editingInitialAssignedDriverId, setEditingInitialAssignedDriverId] = useState<number | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedServiceId, setSelectedServiceId] = useState<number | null>(null);
  const [selectedForPrintIds, setSelectedForPrintIds] = useState<number[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [outsourceOpen, setOutsourceOpen] = useState(false);
  const [outsourcePartnerQuery, setOutsourcePartnerQuery] = useState('');
  const [outsourcePartnerId, setOutsourcePartnerId] = useState<number | ''>('');
  const [outsourcePricePartner, setOutsourcePricePartner] = useState('');
  const [partnerHistory, setPartnerHistory] = useState<ServicePartnerHistoryItem | null>(null);
  const [partnerHistoryLoading, setPartnerHistoryLoading] = useState(false);
  const [partnerEmailSending, setPartnerEmailSending] = useState(false);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [filters, setFilters] = useState<ServicesFilterState>(defaultFilters);
  const [form, setForm] = useState<ServiceFormState>(defaultForm);

  const thStyle = {
    textAlign: 'left' as const,
    padding: '0 12px 10px 0',
    whiteSpace: 'nowrap' as const,
    borderBottom: '1px solid #dce8f5'
  };

  const tdStyle = {
    padding: '10px 12px 10px 0',
    verticalAlign: 'top' as const,
    borderBottom: '1px solid #eaf1f9'
  };

  function statusLabel(status: ServiceStatus) {
    if (status === 'OPEN') {
      return 'Aperto';
    }
    if (status === 'ASSIGNED') {
      return 'Assegnato';
    }
    if (status === 'EXECUTED') {
      return 'Eseguito';
    }
    return 'Chiuso';
  }

  function statusClass(status: ServiceStatus) {
    if (status === 'ASSIGNED') {
      return 'assigned';
    }
    if (status === 'EXECUTED') {
      return 'executed';
    }
    if (status === 'CLOSED') {
      return 'closed';
    }
    return 'open';
  }

  function typeLabel(type: ServiceType) {
    if (type === 'TRANSFER') {
      return 'Transfer';
    }
    return 'Tour';
  }

  function assignmentTypeLabel(type: ServiceAssignmentType) {
    if (type === 'OUTSOURCED') {
      return 'Affidato';
    }
    if (type === 'INCOMING') {
      return 'Ricevuto';
    }
    return 'Interno';
  }

  function assignmentTypeClass(type: ServiceAssignmentType) {
    if (type === 'OUTSOURCED') {
      return 'assigned';
    }
    if (type === 'INCOMING') {
      return 'open';
    }
    return 'closed';
  }

  function toStartDateTime(dateValue: string) {
    return `${dateValue}T00:00:00`;
  }

  function toNextDayStartDateTime(dateValue: string) {
    const day = new Date(`${dateValue}T00:00:00`);
    day.setDate(day.getDate() + 1);
    const year = day.getFullYear();
    const month = String(day.getMonth() + 1).padStart(2, '0');
    const date = String(day.getDate()).padStart(2, '0');
    return `${year}-${month}-${date}T00:00:00`;
  }

  async function loadDrivers() {
    const response = await fetch('/api/gestionale/drivers', { cache: 'no-store' });
    const payload = (await response.json().catch(() => [])) as DriverItem[] | { message?: string };

    if (!response.ok) {
      setError((payload as { message?: string }).message ?? 'Errore caricamento driver');
      return;
    }

    setDrivers(payload as DriverItem[]);
  }

  async function loadVehicles() {
    const response = await fetch('/api/fleet/vehicles', { cache: 'no-store' });
    const payload = (await response.json().catch(() => [])) as VehicleItem[] | { message?: string };

    if (!response.ok) {
      setError((payload as { message?: string }).message ?? 'Errore caricamento veicoli');
      return;
    }

    setVehicles(payload as VehicleItem[]);
  }

  async function loadPartners() {
    const response = await fetch('/api/partners', { cache: 'no-store' });
    const payload = (await response.json().catch(() => [])) as PartnerItem[] | { message?: string };

    if (!response.ok) {
      setError((payload as { message?: string }).message ?? 'Errore caricamento partner');
      return;
    }

    setPartners((payload as PartnerItem[]).filter((partner) => !partner.deleted));
  }

  async function loadServices() {
    setLoading(true);
    setError(null);

    const effectiveStatus: ServiceStatus | '' = filters.onlyUnassigned ? 'OPEN' : filters.status;

    const query = new URLSearchParams();
    if (effectiveStatus) {
      query.set('status', effectiveStatus);
    }
    if (filters.driverId) {
      query.set('driverId', String(filters.driverId));
    }
    if (filters.fromDate) {
      query.set('from', toStartDateTime(filters.fromDate));
    }
    if (filters.toDate) {
      query.set('to', toNextDayStartDateTime(filters.toDate));
    }

    const targetUrl = query.size > 0 ? `/api/services?${query.toString()}` : '/api/services';

    const response = await fetch(targetUrl, { cache: 'no-store' });
    const payload = (await response.json().catch(() => [])) as ServiceItem[] | { message?: string };

    if (!response.ok) {
      setError((payload as { message?: string }).message ?? 'Errore caricamento servizi');
      setLoading(false);
      return;
    }

    const nextServices = payload as ServiceItem[];
    const filteredServices = filters.onlyUnassigned
      ? nextServices.filter((service) => !service.assignedDriverId)
      : nextServices;

    setServices(filteredServices);
    setLoading(false);
  }

  useEffect(() => {
    loadDrivers();
    loadVehicles();
    loadPartners();
  }, []);

  useEffect(() => {
    const active = searchParams.get('unassigned') === '1';
    setFilters((prev) => {
      if (prev.onlyUnassigned === active) {
        return prev;
      }
      return { ...prev, onlyUnassigned: active };
    });
  }, [searchParams]);

  useEffect(() => {
    loadServices();
    setCurrentPage(1);
  }, [filters.status, filters.driverId, filters.fromDate, filters.toDate, filters.onlyUnassigned]);

  function resetForm() {
    setEditingId(null);
    setEditingInitialStatus('OPEN');
    setEditingInitialAssignedDriverId(null);
    setForm(defaultForm);
  }

  function openCreateForm() {
    resetForm();
    setIsFormOpen(true);
  }

  function closeForm() {
    resetForm();
    setIsFormOpen(false);
  }

  function toPayload(status: Exclude<ServiceStatus, 'CLOSED' | 'EXECUTED'>) {
    const assignmentType: ServiceAssignmentType = form.receivedFromPartner
      ? 'INCOMING'
      : form.serviceAssignmentType;

    return {
      startAt: form.startAt,
      pickupLocation: form.pickupLocation,
      destination: form.destination,
      type: form.type,
      durationHours: form.type === 'TOUR' ? Number(form.durationHours) : null,
      notes: form.notes.trim() || null,
      price: form.price.trim() ? Number(form.price) : null,
      externalBookingReference: form.externalBookingReference.trim()
        ? Number(form.externalBookingReference)
        : null,
      clientName: form.clientName.trim() || null,
      clientPhone: form.clientPhone.trim() || null,
      clientEmail: form.clientEmail.trim() || null,
      passengersCount: form.passengersCount.trim() ? Number(form.passengersCount) : null,
      itinerary: form.itinerary.trim() || null,
      status,
      serviceAssignmentType: assignmentType,
      partnerId: form.partnerId ? Number(form.partnerId) : null,
      pricePartner: form.pricePartner.trim() ? Number(form.pricePartner) : null,
      assignedVehicleId: form.assignedVehicleId ? Number(form.assignedVehicleId) : null
    };
  }

  function selectedDriverId(): number | null {
    return form.assignedDriverId ? Number(form.assignedDriverId) : null;
  }

  async function syncAssignment(serviceId: number, desiredDriverId: number | null) {
    const shouldSkip = editingId != null && editingInitialAssignedDriverId === desiredDriverId;
    if (shouldSkip) {
      return true;
    }

    if (desiredDriverId) {
      const response = await fetch(`/api/services/${serviceId}/assign`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ driverId: desiredDriverId })
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { message?: string };
        setError(payload.message ?? 'Assegnazione fallita');
        return false;
      }

      return true;
    }

    if (editingId != null && editingInitialAssignedDriverId) {
      const response = await fetch(`/api/services/${serviceId}/unassign`, { method: 'PATCH' });
      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { message?: string };
        setError(payload.message ?? 'Rimozione assegnazione fallita');
        return false;
      }
    }

    return true;
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(null);

    const effectiveAssignmentType: ServiceAssignmentType = form.receivedFromPartner
      ? 'INCOMING'
      : form.serviceAssignmentType;

    if ((effectiveAssignmentType === 'INCOMING' || effectiveAssignmentType === 'OUTSOURCED') && !form.partnerId) {
      setSubmitting(false);
      setError('Seleziona un partner per servizi ricevuti/affidati');
      return;
    }

    if (effectiveAssignmentType === 'OUTSOURCED' && !form.pricePartner.trim()) {
      setSubmitting(false);
      setError('Inserisci il prezzo partner per servizi affidati');
      return;
    }

    const targetUrl = editingId ? `/api/services/${editingId}` : '/api/services';
    const method = editingId ? 'PUT' : 'POST';

    let overrideVehicleDayConflict = false;
    let overrideVehicleMaintenanceConflict = false;
    let payload: (Partial<ServiceItem> & { message?: string }) = {};
    let responseOk = false;

    for (let attempt = 0; attempt < 4; attempt += 1) {
      const response = await fetch(targetUrl, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...toPayload(editingId ? editingInitialStatus : 'OPEN'),
          overrideVehicleDayConflict,
          overrideVehicleMaintenanceConflict
        })
      });

      payload = (await response.json().catch(() => ({}))) as Partial<ServiceItem> & { message?: string };

      if (response.ok) {
        responseOk = true;
        break;
      }

      const backendMessage = payload.message ?? 'Operazione fallita';

      if (!overrideVehicleDayConflict && backendMessage.includes(vehicleDayConflictMessage)) {
        const confirmed = window.confirm(
          `${vehicleDayConflictMessage}. Vuoi continuare comunque con l'assegnazione?`
        );
        if (confirmed) {
          overrideVehicleDayConflict = true;
          continue;
        }
      }

      if (!overrideVehicleMaintenanceConflict && backendMessage.includes(vehicleMaintenanceConflictMessage)) {
        const confirmed = window.confirm(
          `${vehicleMaintenanceConflictMessage}. Vuoi continuare comunque con l'assegnazione?`
        );
        if (confirmed) {
          overrideVehicleMaintenanceConflict = true;
          continue;
        }
      }

      setSubmitting(false);
      setError(backendMessage);
      return;
    }

    if (!responseOk) {
      setSubmitting(false);
      setError(payload.message ?? 'Operazione fallita');
      return;
    }

    const serviceId = editingId ?? payload.id;
    if (!serviceId) {
      setSubmitting(false);
      setError('Impossibile identificare il servizio salvato');
      return;
    }

    const assignmentSynced = await syncAssignment(serviceId, selectedDriverId());
    setSubmitting(false);
    if (!assignmentSynced) {
      return;
    }

    setSuccess(editingId ? 'Servizio aggiornato' : 'Servizio creato');
    closeForm();
    await loadServices();
  }

  function onEdit(service: ServiceItem) {
    if (service.status === 'CLOSED' || service.status === 'EXECUTED') {
      setError('Un servizio ESEGUITO/CHIUSO non è modificabile');
      return;
    }

    setEditingId(service.id);
    setEditingInitialStatus(service.status);
    setEditingInitialAssignedDriverId(service.assignedDriverId);
    setIsFormOpen(true);
    setError(null);
    setSuccess(null);
    setForm({
      startAt: service.startAt.slice(0, 16),
      pickupLocation: service.pickupLocation,
      destination: service.destination,
      type: service.type,
      durationHours: service.durationHours ? String(service.durationHours) : '',
      notes: service.notes ?? '',
      price: service.price != null ? String(service.price) : '',
      externalBookingReference:
        service.externalBookingReference != null ? String(service.externalBookingReference) : '',
      internalBookingReference: service.internalBookingReference ?? '',
      clientName: service.clientName ?? '',
      clientPhone: service.clientPhone ?? '',
      clientEmail: service.clientEmail ?? '',
      passengersCount: service.passengersCount != null ? String(service.passengersCount) : '',
      itinerary: service.itinerary ?? '',
      serviceAssignmentType: service.serviceAssignmentType,
      partnerId: service.partnerId ?? '',
      pricePartner: service.pricePartner != null ? String(service.pricePartner) : '',
      receivedFromPartner: service.serviceAssignmentType === 'INCOMING',
      assignedDriverId: service.assignedDriverId ?? '',
      assignedVehicleId: service.assignedVehicleId ?? ''
    });
  }

  async function onDelete(serviceId: number) {
    setError(null);
    setSuccess(null);

    const response = await fetch(`/api/services/${serviceId}`, { method: 'DELETE' });
    if (!response.ok) {
      const payload = (await response.json().catch(() => ({}))) as { message?: string };
      setError(payload.message ?? 'Eliminazione fallita');
      return;
    }

    if (editingId === serviceId) {
      resetForm();
    }
    setSuccess('Servizio eliminato');
    await loadServices();
  }

  async function onClose(serviceId: number) {
    setError(null);
    setSuccess(null);

    const response = await fetch(`/api/services/${serviceId}/close`, { method: 'PATCH' });
    if (!response.ok) {
      const payload = (await response.json().catch(() => ({}))) as { message?: string };
      setError(payload.message ?? 'Chiusura fallita');
      return;
    }

    setSuccess('Servizio chiuso (pagamento registrato)');
    await loadServices();
  }

  function openOutsourceModal(service: ServiceItem) {
    setOutsourceOpen(true);
    setOutsourcePartnerQuery('');
    setOutsourcePartnerId(service.partnerId ?? '');
    setOutsourcePricePartner(service.pricePartner != null ? String(service.pricePartner) : '');
    setError(null);
    setSuccess(null);
  }

  function closeOutsourceModal() {
    setOutsourceOpen(false);
    setOutsourcePartnerQuery('');
    setOutsourcePartnerId('');
    setOutsourcePricePartner('');
  }

  async function submitOutsource() {
    if (!selectedService) {
      return;
    }
    if (!outsourcePartnerId) {
      setError('Seleziona un partner');
      return;
    }
    if (!outsourcePricePartner.trim()) {
      setError('Inserisci il prezzo partner');
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccess(null);

    const response = await fetch(`/api/services/${selectedService.id}/outsource`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        partnerId: Number(outsourcePartnerId),
        pricePartner: Number(outsourcePricePartner)
      })
    });

    const payload = (await response.json().catch(() => ({}))) as { message?: string };
    setSubmitting(false);

    if (!response.ok) {
      setError(payload.message ?? 'Affidamento a partner fallito');
      return;
    }

    setSuccess('Servizio affidato a partner');
    closeOutsourceModal();
    await loadServices();
    await loadPartnerHistory(selectedService.id);
  }

  async function loadPartnerHistory(serviceId: number) {
    setPartnerHistoryLoading(true);
    const response = await fetch(`/api/services/${serviceId}/partner-history`, { cache: 'no-store' });
    const payload = (await response.json().catch(() => ({}))) as ServicePartnerHistoryItem | { message?: string };
    setPartnerHistoryLoading(false);

    if (!response.ok) {
      setPartnerHistory(null);
      return;
    }

    setPartnerHistory(payload as ServicePartnerHistoryItem);
  }

  async function sendPartnerEmailFromService(serviceId: number) {
    setPartnerEmailSending(true);
    setError(null);
    setSuccess(null);

    const response = await fetch(`/api/services/${serviceId}/partner-communications/email`, {
      method: 'POST'
    });

    const payload = (await response.json().catch(() => ({}))) as { message?: string };
    setPartnerEmailSending(false);

    if (!response.ok) {
      setError(payload.message ?? 'Invio email partner fallito');
      return;
    }

    setSuccess('Email partner inserita in outbox');
    await loadPartnerHistory(serviceId);
  }

  function openPrint(serviceId: number) {
    if (typeof window === 'undefined') {
      return;
    }
    window.open(`/services/${serviceId}/print`, '_blank', 'noopener,noreferrer');
  }

  function togglePrintSelection(serviceId: number) {
    setSelectedForPrintIds((prev) => (
      prev.includes(serviceId)
        ? prev.filter((id) => id !== serviceId)
        : [...prev, serviceId]
    ));
  }

  function toggleSelectAllOnPage(checked: boolean) {
    const pageIds = paginatedServices.map((item) => item.id);
    if (!checked) {
      setSelectedForPrintIds((prev) => prev.filter((id) => !pageIds.includes(id)));
      return;
    }

    setSelectedForPrintIds((prev) => {
      const next = new Set(prev);
      pageIds.forEach((id) => next.add(id));
      return Array.from(next);
    });
  }

  function printSelectedServices() {
    if (selectedForPrintIds.length === 0) {
      setError('Seleziona almeno un servizio da stampare');
      return;
    }

    setError(null);
    setSuccess(`Apro ${selectedForPrintIds.length} servizi in stampa`);
    const idsParam = selectedForPrintIds.join(',');
    window.open(`/services/print?ids=${encodeURIComponent(idsParam)}`, '_blank', 'noopener,noreferrer');
  }

  function assignedDriverLabel(service: ServiceItem) {
    if (!service.assignedDriverId) {
      return 'Non assegnato';
    }

    const found = drivers.find((driver) => driver.id === service.assignedDriverId);
    if (!found) {
      return `#${service.assignedDriverId}`;
    }

    return driverLabel(found);
  }

  function assignedVehicleLabel(service: ServiceItem) {
    if (!service.assignedVehicleId) {
      return 'Non assegnato';
    }
    const found = vehicles.find((vehicle) => vehicle.id === service.assignedVehicleId);
    if (!found) {
      return `#${service.assignedVehicleId}`;
    }
    return found.plate;
  }

  function partnerLabel(partnerId: number | null) {
    if (!partnerId) {
      return '-';
    }
    const found = partners.find((partner) => partner.id === partnerId);
    if (!found) {
      return `#${partnerId}`;
    }
    return found.ragioneSociale;
  }

  const orderedServices = useMemo(
    () => [...services].sort((a, b) => new Date(b.startAt).getTime() - new Date(a.startAt).getTime()),
    [services]
  );

  const overdueExecutedServices = useMemo(() => {
    const now = Date.now();
    const thresholdMs = 20 * 24 * 60 * 60 * 1000;
    return orderedServices.filter((service) => {
      if (service.status !== 'EXECUTED') {
        return false;
      }
      const executedAt = new Date(service.updatedAt).getTime();
      if (Number.isNaN(executedAt)) {
        return false;
      }
      return now - executedAt > thresholdMs;
    });
  }, [orderedServices]);

  const totalPages = Math.max(1, Math.ceil(orderedServices.length / PAGE_SIZE));

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const paginatedServices = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return orderedServices.slice(start, start + PAGE_SIZE);
  }, [orderedServices, currentPage]);

  const selectedService = useMemo(
    () => orderedServices.find((item) => item.id === selectedServiceId) ?? null,
    [orderedServices, selectedServiceId]
  );

  const filteredPartners = useMemo(() => {
    const query = outsourcePartnerQuery.trim().toLowerCase();
    if (!query) {
      return partners;
    }
    return partners.filter((partner) => partner.ragioneSociale.toLowerCase().includes(query));
  }, [partners, outsourcePartnerQuery]);

  const outsourceMarginPreview = useMemo(() => {
    if (!selectedService || !outsourcePricePartner.trim()) {
      return null;
    }
    const servicePrice = selectedService.price;
    const partnerPrice = Number(outsourcePricePartner);
    if (servicePrice == null || Number.isNaN(partnerPrice)) {
      return null;
    }
    return servicePrice - partnerPrice;
  }, [selectedService, outsourcePricePartner]);

  useEffect(() => {
    if (!selectedServiceId) {
      setPartnerHistory(null);
      return;
    }
    loadPartnerHistory(selectedServiceId);
    if (!orderedServices.some((item) => item.id === selectedServiceId)) {
      setSelectedServiceId(null);
    }
  }, [orderedServices, selectedServiceId]);

  useEffect(() => {
    const validIds = new Set(orderedServices.map((item) => item.id));
    setSelectedForPrintIds((prev) => prev.filter((id) => validIds.has(id)));
  }, [orderedServices]);

  const allCurrentPageSelected = paginatedServices.length > 0
    && paginatedServices.every((service) => selectedForPrintIds.includes(service.id));

  return (
    <section className="responsive-panel services-panel" style={{ display: 'grid', gap: 16, maxWidth: '100%' }}>
      <article className="dashboard-card">
        <div className="panel-header services-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <h3 className="services-title">Lista servizi</h3>
          <button
            type="button"
            className="primary-button compact-button services-new-button"
            onClick={() => {
              if (isFormOpen && !editingId) {
                closeForm();
              } else {
                openCreateForm();
              }
            }}
          >
            <ButtonContent icon={isFormOpen && !editingId ? <LockIcon /> : <AddIcon />}>{isFormOpen && !editingId ? 'Chiudi form' : 'Nuovo servizio'}</ButtonContent>
          </button>
        </div>
        <button
          type="button"
          className="services-filters-label"
          onClick={() => setMobileFiltersOpen((prev) => !prev)}
          aria-expanded={mobileFiltersOpen}
          aria-controls="services-filters-grid"
        >
          {mobileFiltersOpen ? 'Nascondi filtri ▲' : 'Mostra filtri ▼'}
        </button>
        <div
          id="services-filters-grid"
          className={`responsive-filters-grid services-filters-grid ${mobileFiltersOpen ? '' : 'is-hidden-mobile'}`}
          style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 8, marginTop: 8 }}
        >
          <label>
            Stato
            <select
              className="form-input"
              value={filters.status}
              onChange={(event) => {
                const nextStatus = event.target.value as ServiceStatus | '';
                setFilters((prev) => ({
                  ...prev,
                  status: nextStatus,
                  onlyUnassigned: nextStatus === 'ASSIGNED' || nextStatus === 'EXECUTED' || nextStatus === 'CLOSED'
                    ? false
                    : prev.onlyUnassigned
                }));
              }}
            >
              <option value="">Tutti</option>
              <option value="OPEN">Aperti</option>
              <option value="ASSIGNED">Assegnati</option>
              <option value="EXECUTED">Eseguiti</option>
              <option value="CLOSED">Chiusi</option>
            </select>
          </label>

          <label>
            Driver
            <select
              className="form-input"
              value={filters.driverId}
              onChange={(event) =>
                setFilters((prev) => ({
                  ...prev,
                  driverId: event.target.value ? Number(event.target.value) : ''
                }))
              }
            >
              <option value="">Tutti</option>
              {drivers.map((driver) => (
                <option key={driver.id} value={driver.id}>{driverLabel(driver)}</option>
              ))}
            </select>
          </label>

          <label>
            Da data
            <input
              className="form-input"
              type="date"
              value={filters.fromDate}
              onChange={(event) => setFilters((prev) => ({ ...prev, fromDate: event.target.value }))}
            />
          </label>

          <label>
            A data
            <input
              className="form-input"
              type="date"
              value={filters.toDate}
              onChange={(event) => setFilters((prev) => ({ ...prev, toDate: event.target.value }))}
            />
          </label>

          <label className="inline-checkbox" style={{ display: 'flex', alignItems: 'end', gap: 8, paddingBottom: 4 }}>
            <input
              type="checkbox"
              checked={filters.onlyUnassigned}
              onChange={(event) =>
                setFilters((prev) => ({
                  ...prev,
                  onlyUnassigned: event.target.checked,
                  status: event.target.checked ? 'OPEN' : prev.status
                }))
              }
            />
            Solo non assegnati
          </label>

          <div className="panel-end-action" style={{ display: 'flex', alignItems: 'end', justifyContent: 'flex-end' }}>
            <button
              type="button"
              className="logout-button compact-button"
              onClick={() => setFilters(defaultFilters)}
            >
              <ButtonContent icon={<ResetIcon />}>Reset filtri</ButtonContent>
            </button>
          </div>
        </div>
        {filters.onlyUnassigned && (
          <div style={{ marginTop: 8, marginBottom: 8, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 600 }}>Filtro attivo: Non assegnati</span>
            <button
              type="button"
              className="logout-button compact-button"
              onClick={() => setFilters((prev) => ({ ...prev, onlyUnassigned: false }))}
            >
              <ButtonContent icon={<CancelIcon />}>Rimuovi filtro</ButtonContent>
            </button>
          </div>
        )}
        {overdueExecutedServices.length > 0 && (
          <div style={{ marginTop: 10, marginBottom: 10, padding: 10, borderRadius: 10, background: '#fff4df', border: '1px solid #f2d39a' }}>
            <strong style={{ display: 'block', color: '#8a4b00' }}>
              Attenzione: {overdueExecutedServices.length} servizi in stato Eseguito da oltre 20 giorni
            </strong>
            <span style={{ color: '#8a4b00' }}>
              Verifica l'incasso dal partner e chiudi i servizi in sospeso.
            </span>
          </div>
        )}
        {error && <p className="error-text">{error}</p>}
        {success && <p className="success-text">{success}</p>}
        {loading ? (
          <p>Caricamento servizi...</p>
        ) : (
          <>
            {selectedService && (
              <div className="dashboard-card services-selected-detail" style={{ marginTop: 10 }}>
                <div className="services-selected-header">
                  <div className="services-selected-heading">
                    <strong className="services-selected-title">Servizio #{selectedService.id}</strong>
                    <span className={`services-selected-chip services-selected-chip-status ${statusClass(selectedService.status)}`}>
                      {statusLabel(selectedService.status)}
                    </span>
                    <span className="services-selected-chip services-selected-chip-type">{typeLabel(selectedService.type)}</span>
                    <span className={`services-selected-chip services-selected-chip-status ${assignmentTypeClass(selectedService.serviceAssignmentType)}`}>
                      {assignmentTypeLabel(selectedService.serviceAssignmentType)}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="services-selected-close"
                    aria-label="Chiudi dettaglio servizio"
                    onClick={() => setSelectedServiceId(null)}
                  >
                    x
                  </button>
                </div>

                <div className="services-selected-grid">
                  <div className="services-selected-column">
                    <ServiceDetailRow
                      icon={<MobileClockIcon />}
                      label="Data e ora"
                      value={new Date(selectedService.startAt).toLocaleString('it-IT')}
                    />
                    <ServiceDetailRow
                      icon={<MobilePinIcon />}
                      label="Pickup"
                      value={selectedService.pickupLocation}
                    />
                    <ServiceDetailRow
                      icon={<MobilePinIcon />}
                      label="Destinazione"
                      value={selectedService.destination}
                    />
                  </div>
                  <div className="services-selected-column">
                    <ServiceDetailRow
                      icon={<DetailUserIcon />}
                      label="Driver"
                      value={assignedDriverLabel(selectedService)}
                    />
                    <ServiceDetailRow
                      icon={<DetailCarIcon />}
                      label="Veicolo"
                      value={assignedVehicleLabel(selectedService)}
                    />
                    <ServiceDetailRow
                      icon={<DetailEuroIcon />}
                      label="Prezzo"
                      value={formatCurrencyEUR(selectedService.price)}
                    />
                    <ServiceDetailRow
                      icon={<DetailUserIcon />}
                      label="Partner"
                      value={partnerLabel(selectedService.partnerId)}
                    />
                    <ServiceDetailRow
                      icon={<DetailEuroIcon />}
                      label="Prezzo partner"
                      value={formatCurrencyEUR(selectedService.pricePartner)}
                    />
                    <ServiceDetailRow
                      icon={<DetailEuroIcon />}
                      label="Margine"
                      value={formatCurrencyEUR(selectedService.margin)}
                    />
                  </div>
                </div>

                <div className="services-selected-divider" />

                <div className="services-selected-grid">
                  <div className="services-selected-column">
                    <ServiceDetailRow
                      icon={<DetailUserIcon />}
                      label="Cliente"
                      value={selectedService.clientName ?? '-'}
                    />
                    <ServiceDetailRow
                      icon={<DetailPhoneIcon />}
                      label="Telefono"
                      value={selectedService.clientPhone ?? '-'}
                    />
                    <ServiceDetailRow
                      icon={<DetailMailIcon />}
                      label="Email"
                      value={selectedService.clientEmail ?? '-'}
                    />
                  </div>
                  <div className="services-selected-column">
                    <ServiceDetailRow
                      icon={<DetailDocumentIcon />}
                      label="Passeggeri"
                      value={selectedService.passengersCount ?? '-'}
                    />
                    <ServiceDetailRow
                      icon={<DetailDocumentIcon />}
                      label="Rif. esterno"
                      value={selectedService.externalBookingReference ?? '-'}
                    />
                    <ServiceDetailRow
                      icon={<DetailDocumentIcon />}
                      label="Rif. interno"
                      value={selectedService.internalBookingReference ?? '-'}
                    />
                    <ServiceDetailRow
                      icon={<DetailDocumentIcon />}
                      label="Itinerario"
                      value={selectedService.itinerary ?? '-'}
                    />
                    <ServiceDetailRow
                      icon={<DetailDocumentIcon />}
                      label="Note"
                      value={selectedService.notes ?? '-'}
                    />
                  </div>
                </div>

                <div className="services-selected-divider" />

                <div className="table-actions services-selected-actions" style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button type="button" className="primary-button compact-button" onClick={() => onEdit(selectedService)}>
                    <span className="action-button-icon"><ActionEditIcon /></span>
                    Modifica
                  </button>
                  <button
                    type="button"
                    className="primary-button compact-button services-selected-delete"
                    onClick={() => onDelete(selectedService.id)}
                  >
                    <span className="action-button-icon"><ActionDeleteIcon /></span>
                    Elimina
                  </button>
                  {selectedService.status === 'EXECUTED' && (
                    <button
                      type="button"
                      className="compact-button services-selected-close-service"
                      onClick={() => onClose(selectedService.id)}
                    >
                      <span className="action-button-icon"><ActionLockIcon /></span>
                      Chiudi
                    </button>
                  )}
                  {selectedService.serviceAssignmentType === 'INTERNAL'
                    && selectedService.status !== 'CLOSED'
                    && selectedService.status !== 'EXECUTED' && (
                    <button
                      type="button"
                      className="compact-button services-selected-outsource"
                      onClick={() => openOutsourceModal(selectedService)}
                    >
                      <span className="action-button-icon"><ActionHandshakeIcon /></span>
                      Affida servizio al partner
                    </button>
                  )}
                  <button type="button" className="compact-button services-selected-print" onClick={() => openPrint(selectedService.id)}>
                    <span className="action-button-icon"><ActionPrintIcon /></span>
                    Stampa
                  </button>
                  <button
                    type="button"
                    className="compact-button services-selected-deselect"
                    onClick={() => setSelectedServiceId(null)}
                  >
                    <span className="action-button-icon"><ActionDeselectIcon /></span>
                    Deseleziona
                  </button>
                </div>

                <div className="services-selected-divider" />
                <div style={{ marginTop: 10 }}>
                  <strong style={{ display: 'block', marginBottom: 8 }}>Storico partner servizio</strong>
                  {partnerHistoryLoading ? (
                    <p style={{ margin: 0, color: 'var(--muted)' }}>Caricamento storico...</p>
                  ) : !partnerHistory ? (
                    <p style={{ margin: 0, color: 'var(--muted)' }}>Nessuno storico disponibile per questo servizio.</p>
                  ) : (
                    <div style={{ display: 'grid', gap: 8 }}>
                      <p style={{ margin: 0 }}>
                        <strong>Partner:</strong> {partnerHistory.partnerRagioneSociale ?? '-'} ({partnerHistory.partnerEmail ?? '-'})
                      </p>
                      <p style={{ margin: 0 }}>
                        <strong>Comunicazioni email inviate:</strong> {partnerHistory.communications.length}
                      </p>
                      {partnerHistory.communications.length > 0 && (
                        <div className="table-scroll" style={{ overflowX: 'auto' }}>
                          <table className="responsive-table" style={{ width: '100%', borderCollapse: 'collapse', minWidth: 560 }}>
                            <thead>
                              <tr>
                                <th style={thStyle}>Canale</th>
                                <th style={thStyle}>Destinatario</th>
                                <th style={thStyle}>Oggetto</th>
                                <th style={thStyle}>Data invio</th>
                              </tr>
                            </thead>
                            <tbody>
                              {partnerHistory.communications.map((communication) => (
                                <tr key={communication.communicationId}>
                                  <td style={tdStyle}>{communication.channel}</td>
                                  <td style={tdStyle}>{communication.recipient}</td>
                                  <td style={tdStyle}>{communication.subject}</td>
                                  <td style={tdStyle}>{new Date(communication.createdAt).toLocaleString('it-IT')}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                      <div>
                        <button
                          type="button"
                          className="logout-button compact-button"
                          onClick={() => sendPartnerEmailFromService(selectedService.id)}
                          disabled={partnerEmailSending || !selectedService.partnerId}
                        >
                          <ButtonContent icon={<SharedPartnerIcon />}>{partnerEmailSending ? 'Invio email...' : 'Invia email al partner'}</ButtonContent>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
            <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginTop: 10, flexWrap: 'wrap' }}>
              <small style={{ color: 'var(--muted)' }}>
                Selezionati per stampa: {selectedForPrintIds.length}
              </small>
              <div className="panel-actions" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="primary-button compact-button"
                  onClick={printSelectedServices}
                >
                  <ButtonContent icon={<SharedPrintIcon />}>Stampa selezionati</ButtonContent>
                </button>
                <button
                  type="button"
                  className="logout-button compact-button"
                  onClick={() => setSelectedForPrintIds([])}
                  disabled={selectedForPrintIds.length === 0}
                >
                  <ButtonContent icon={<ResetIcon />}>Pulisci selezione</ButtonContent>
                </button>
              </div>
            </div>
            <div className="table-scroll services-desktop-table" style={{ overflowX: 'auto', marginTop: 8, maxWidth: '100%' }}>
            <table className="responsive-table services-table" style={{ width: '100%', minWidth: 860, borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={thStyle}>
                    <input
                      type="checkbox"
                      checked={allCurrentPageSelected}
                      onChange={(event) => toggleSelectAllOnPage(event.target.checked)}
                      aria-label="Seleziona tutti i servizi in pagina per la stampa"
                    />
                  </th>
                  <th style={thStyle}>Inizio</th>
                  <th style={thStyle}>Pickup</th>
                  <th style={thStyle}>Destinazione</th>
                  <th style={thStyle}>Tipo</th>
                  <th style={thStyle}>Prezzo</th>
                  <th style={thStyle}>Driver</th>
                  <th style={thStyle}>Veicolo</th>
                  <th style={thStyle}>Stato</th>
                  <th style={thStyle}>Azioni</th>
                </tr>
              </thead>
              <tbody>
                {paginatedServices.map((service) => (
                  <tr
                    key={service.id}
                    style={{
                      background: selectedServiceId === service.id ? '#eaf4ff' : 'transparent',
                      color: service.status === 'CLOSED' ? '#7f8ea3' : 'inherit'
                    }}
                  >
                    <td style={tdStyle}>
                      <input
                        type="checkbox"
                        checked={selectedForPrintIds.includes(service.id)}
                        onChange={() => togglePrintSelection(service.id)}
                        aria-label={`Seleziona servizio ${service.id} per stampa multipla`}
                      />
                    </td>
                    <td style={tdStyle}>{new Date(service.startAt).toLocaleString('it-IT')}</td>
                    <td style={{ ...tdStyle, minWidth: 180, lineHeight: 1.35 }}>{service.pickupLocation}</td>
                    <td style={{ ...tdStyle, minWidth: 180, lineHeight: 1.35 }}>{service.destination}</td>
                    <td style={tdStyle}>{typeLabel(service.type)}</td>
                    <td style={tdStyle}>{formatCurrencyEUR(service.price)}</td>
                    <td style={{ ...tdStyle, minWidth: 140 }}>
                      {assignedDriverLabel(service)}
                    </td>
                    <td style={{ ...tdStyle, minWidth: 100 }}>
                      {assignedVehicleLabel(service)}
                    </td>
                    <td style={tdStyle}>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '4px 8px',
                          borderRadius: 999,
                          fontSize: 12,
                          fontWeight: 600,
                          background:
                            service.status === 'CLOSED'
                              ? '#eceff3'
                              : service.status === 'EXECUTED'
                                ? '#fff3e6'
                              : service.status === 'ASSIGNED'
                                ? '#e8f5e9'
                                : '#fff4e5',
                          color:
                            service.status === 'CLOSED'
                              ? '#5f6b7a'
                              : service.status === 'EXECUTED'
                                ? '#b45f06'
                              : service.status === 'ASSIGNED'
                                ? '#2e7d32'
                                : '#b26a00'
                        }}
                      >
                        {statusLabel(service.status)}
                      </span>
                    </td>
                    <td style={{ ...tdStyle, minWidth: 180 }}>
                      <div className="table-actions" style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                        <button
                          type="button"
                          className="primary-button compact-button"
                          onClick={() => setSelectedServiceId(service.id)}
                        >
                          <ButtonContent icon={<SelectIcon />}>Seleziona</ButtonContent>
                        </button>
                        <button
                          type="button"
                          className="primary-button compact-button"
                          onClick={() => openPrint(service.id)}
                        >
                          <ButtonContent icon={<SharedPrintIcon />}>Stampa</ButtonContent>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
            <div className="services-mobile-list" style={{ marginTop: 8 }}>
              <label className="inline-checkbox services-mobile-select-all">
                <input
                  type="checkbox"
                  checked={allCurrentPageSelected}
                  onChange={(event) => toggleSelectAllOnPage(event.target.checked)}
                  aria-label="Seleziona tutti i servizi in pagina per la stampa"
                />
                Seleziona tutti in pagina
              </label>
              {paginatedServices.map((service) => {
                const isSelected = selectedServiceId === service.id;
                const isChecked = selectedForPrintIds.includes(service.id);

                return (
                  <article
                    key={service.id}
                    className={`service-mobile-card ${isSelected ? 'is-selected' : ''} ${service.status === 'CLOSED' ? 'is-closed' : ''}`}
                  >
                    <div className="service-mobile-card-top">
                      <div className="service-mobile-badges">
                        <span className="service-chip service-chip-type">{typeLabel(service.type)}</span>
                        <span className={`service-chip service-chip-status ${statusClass(service.status)}`}>
                          {statusLabel(service.status)}
                        </span>
                        <span className={`service-chip service-chip-status ${assignmentTypeClass(service.serviceAssignmentType)}`}>
                          {assignmentTypeLabel(service.serviceAssignmentType)}
                        </span>
                      </div>
                      <strong className="service-mobile-price">{formatCurrencyEUR(service.price)}</strong>
                    </div>

                    <div className="service-mobile-date">
                      <span className="service-mobile-icon"><MobileClockIcon /></span>
                      <span>{new Date(service.startAt).toLocaleString('it-IT')}</span>
                    </div>
                    <div className="service-mobile-route">
                      <span className="service-mobile-icon"><MobilePinIcon /></span>
                      <span className="service-mobile-place">{service.pickupLocation}</span>
                      <span className="service-mobile-arrow"><MobileArrowRightIcon /></span>
                      <span className="service-mobile-place">{service.destination}</span>
                    </div>

                    <div className="service-mobile-meta">
                      <span>{assignedDriverLabel(service)}</span>
                      <span>{assignedVehicleLabel(service)}</span>
                    </div>

                    <div className="service-mobile-actions">
                      <label className="inline-checkbox">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => togglePrintSelection(service.id)}
                          aria-label={`Seleziona servizio ${service.id} per stampa multipla`}
                        />
                        Stampa
                      </label>
                      <button
                        type="button"
                        className="primary-button compact-button"
                        onClick={() => setSelectedServiceId(service.id)}
                      >
                        <ButtonContent icon={<SelectIcon />}>Seleziona</ButtonContent>
                      </button>
                      <button
                        type="button"
                        className="logout-button compact-button"
                        onClick={() => openPrint(service.id)}
                      >
                        <ButtonContent icon={<OpenIcon />}>Apri</ButtonContent>
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
            <div className="panel-header panel-pagination" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
              <span>
                Pagina {currentPage} di {totalPages}
              </span>
              <div className="panel-actions" style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  className="logout-button"
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  aria-label="Pagina precedente"
                  title="Pagina precedente"
                >
                  <ButtonContent icon={<ArrowLeftIcon />}>Prec.</ButtonContent>
                </button>
                <button
                  type="button"
                  className="logout-button"
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  aria-label="Pagina successiva"
                  title="Pagina successiva"
                >
                  <ButtonContent icon={<ArrowRightIcon />}>Succ.</ButtonContent>
                </button>
              </div>
            </div>
          </>
        )}
      </article>

      {outsourceOpen && selectedService && (
        <div className="services-modal-overlay" role="dialog" aria-modal="true" aria-label="Affida servizio a partner">
          <article className="dashboard-card services-modal-card services-outsource-modal-card">
            <div className="services-outsource-modal-header">
              <h3 className="services-outsource-modal-title">Affida servizio #{selectedService.id} a partner</h3>
              <button
                type="button"
                className="services-outsource-modal-close"
                onClick={closeOutsourceModal}
                aria-label="Chiudi finestra affidamento"
                title="Chiudi"
              >
                ×
              </button>
            </div>

            <div className="services-outsource-modal-grid">
              <label className="services-outsource-modal-field">
                Cerca partner
                <div className="services-outsource-input-wrap">
                  <span className="services-outsource-input-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
                      <circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" strokeWidth="2" />
                      <line x1="16" y1="16" x2="21" y2="21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  </span>
                  <input
                    className="form-input services-outsource-input with-icon"
                    value={outsourcePartnerQuery}
                    onChange={(event) => setOutsourcePartnerQuery(event.target.value)}
                    placeholder="Filtra per ragione sociale"
                  />
                </div>
              </label>

              <label className="services-outsource-modal-field">
                Partner
                <select
                  className="form-input services-outsource-input services-outsource-select"
                  value={outsourcePartnerId}
                  onChange={(event) => setOutsourcePartnerId(event.target.value ? Number(event.target.value) : '')}
                >
                  <option value="">Seleziona partner</option>
                  {filteredPartners.map((partner) => (
                    <option key={partner.id} value={partner.id}>{partner.ragioneSociale}</option>
                  ))}
                </select>
              </label>

              <label className="services-outsource-modal-field">
                Prezzo partner
                <div className="services-outsource-input-wrap">
                  <span className="services-outsource-input-icon" aria-hidden="true">€</span>
                  <input
                    className="form-input services-outsource-input with-icon"
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step="0.01"
                    value={outsourcePricePartner}
                    onChange={(event) => setOutsourcePricePartner(event.target.value)}
                    placeholder="0.00"
                  />
                </div>
                <small className="services-outsource-margin-preview">
                  Margine previsto: {outsourceMarginPreview == null ? '-' : formatCurrencyEUR(outsourceMarginPreview)}
                </small>
              </label>

              <div className="form-actions services-outsource-modal-actions">
                <button
                  type="button"
                  className="primary-button compact-button services-outsource-confirm"
                  onClick={submitOutsource}
                  disabled={submitting || !outsourcePartnerId || !outsourcePricePartner.trim()}
                >
                  <ButtonContent icon={<SharedPartnerIcon />}>{submitting ? 'Salvataggio...' : 'Conferma affidamento'}</ButtonContent>
                </button>
                <button type="button" className="logout-button compact-button services-outsource-cancel" onClick={closeOutsourceModal}><ButtonContent icon={<CancelIcon />}>Annulla</ButtonContent></button>
              </div>
            </div>
          </article>
        </div>
      )}

      {isFormOpen && (
        <article className="dashboard-card">
          <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
            <h3>{editingId ? `Modifica servizio #${editingId}` : 'Nuovo servizio'}</h3>
            <button type="button" className="logout-button" onClick={closeForm}><ButtonContent icon={<LockIcon />}>Chiudi</ButtonContent></button>
          </div>
          <form className="form-grid" onSubmit={onSubmit}>
            <label>
              Data/ora inizio
              <input
                className="form-input"
                type="datetime-local"
                value={form.startAt}
                onChange={(event) => setForm((prev) => ({ ...prev, startAt: event.target.value }))}
                required
              />
            </label>

            <label>
              Pickup
              <input
                className="form-input"
                value={form.pickupLocation}
                onChange={(event) => setForm((prev) => ({ ...prev, pickupLocation: event.target.value }))}
                required
              />
            </label>

            <label>
              Destinazione
              <input
                className="form-input"
                value={form.destination}
                onChange={(event) => setForm((prev) => ({ ...prev, destination: event.target.value }))}
                required
              />
            </label>

            <label>
              Tipologia
              <select
                className="form-input"
                value={form.type}
                onChange={(event) => setForm((prev) => ({ ...prev, type: event.target.value as ServiceType }))}
              >
                <option value="TRANSFER">TRANSFER</option>
                <option value="TOUR">TOUR</option>
              </select>
            </label>

            {form.type === 'TOUR' && (
              <label>
                Durata ore
                <input
                  className="form-input"
                  type="number"
                  min={1}
                  value={form.durationHours}
                  onChange={(event) => setForm((prev) => ({ ...prev, durationHours: event.target.value }))}
                  required
                />
              </label>
            )}

            <label>
              Prezzo (opzionale)
              <input
                className="form-input"
                type="number"
                min={0}
                step="0.01"
                value={form.price}
                onChange={(event) => setForm((prev) => ({ ...prev, price: event.target.value }))}
              />
              <small style={{ color: 'var(--muted)' }}>
                {form.price.trim() ? `Anteprima: ${formatCurrencyEUR(Number(form.price))}` : 'Anteprima: -'}
              </small>
            </label>

            <label>
              Rif. prenotazione esterno (opzionale)
              <input
                className="form-input"
                type="number"
                min={0}
                step="1"
                value={form.externalBookingReference}
                onChange={(event) => setForm((prev) => ({ ...prev, externalBookingReference: event.target.value }))}
              />
            </label>

            <label>
              Rif. prenotazione interno
              <input
                className="form-input"
                value={form.internalBookingReference || (editingId ? '' : 'Generato al salvataggio')}
                readOnly
                disabled
                style={{ color: 'var(--text-muted, #888)', cursor: 'not-allowed' }}
              />
            </label>

            <label>
              Nome cliente
              <input
                className="form-input"
                value={form.clientName}
                onChange={(event) => setForm((prev) => ({ ...prev, clientName: event.target.value }))}
              />
            </label>

            <label>
              Telefono cliente
              <input
                className="form-input"
                value={form.clientPhone}
                onChange={(event) => setForm((prev) => ({ ...prev, clientPhone: event.target.value }))}
              />
            </label>

            <label>
              Email cliente
              <input
                className="form-input"
                type="email"
                value={form.clientEmail}
                onChange={(event) => setForm((prev) => ({ ...prev, clientEmail: event.target.value }))}
              />
            </label>

            <label>
              Numero passeggeri
              <input
                className="form-input"
                type="number"
                min={1}
                step="1"
                value={form.passengersCount}
                onChange={(event) => setForm((prev) => ({ ...prev, passengersCount: event.target.value }))}
              />
            </label>

            <label>
              Itinerario
              <textarea
                className="form-input"
                value={form.itinerary}
                onChange={(event) => setForm((prev) => ({ ...prev, itinerary: event.target.value }))}
                rows={3}
              />
            </label>

            {!editingId && (
              <label className="inline-checkbox" style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 8 }}>
                <input
                  type="checkbox"
                  checked={form.receivedFromPartner}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      receivedFromPartner: event.target.checked,
                      serviceAssignmentType: event.target.checked ? 'INCOMING' : 'INTERNAL',
                      pricePartner: event.target.checked ? '' : prev.pricePartner
                    }))
                  }
                />
                Ricevuto da partner
              </label>
            )}

            {(form.receivedFromPartner || form.serviceAssignmentType === 'INCOMING' || form.serviceAssignmentType === 'OUTSOURCED') && (
              <label>
                Partner
                <select
                  className="form-input"
                  value={form.partnerId}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      partnerId: event.target.value ? Number(event.target.value) : ''
                    }))
                  }
                  required={form.receivedFromPartner || form.serviceAssignmentType !== 'INTERNAL'}
                >
                  <option value="">Seleziona partner</option>
                  {partners.map((partner) => (
                    <option key={partner.id} value={partner.id}>{partner.ragioneSociale}</option>
                  ))}
                </select>
              </label>
            )}

            {editingId && (
              <label>
                Modalita` gestione servizio
                <input
                  className="form-input"
                  value={assignmentTypeLabel(form.serviceAssignmentType)}
                  readOnly
                  disabled
                />
              </label>
            )}

            <label>
              Driver (opzionale)
              <select
                className="form-input"
                value={form.assignedDriverId}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    assignedDriverId: event.target.value ? Number(event.target.value) : ''
                  }))
                }
              >
                <option value="">Non assegnato</option>
                {drivers.map((driver) => (
                  <option key={driver.id} value={driver.id}>{driverLabel(driver)}</option>
                ))}
              </select>
            </label>

            <label>
              Veicolo (opzionale)
              <select
                className="form-input"
                value={form.assignedVehicleId}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    assignedVehicleId: event.target.value ? Number(event.target.value) : ''
                  }))
                }
              >
                <option value="">Non assegnato</option>
                {vehicles.map((vehicle) => (
                  <option key={vehicle.id} value={vehicle.id}>{vehicle.plate}</option>
                ))}
              </select>
            </label>

            <label>
              Note
              <textarea
                className="form-input"
                value={form.notes}
                onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
                rows={4}
              />
            </label>

            <div className="form-actions sticky-mobile" style={{ display: 'flex', gap: 8 }}>
              <button type="submit" className="primary-button compact-button" disabled={submitting}>
                <ButtonContent icon={editingId ? <SaveIcon /> : <AddIcon />}>{submitting ? 'Salvataggio...' : editingId ? 'Aggiorna servizio' : 'Crea servizio'}</ButtonContent>
              </button>
              {editingId && (
                <button type="button" className="logout-button" onClick={openCreateForm}><ButtonContent icon={<AddIcon />}>Nuovo servizio</ButtonContent></button>
              )}
            </div>
          </form>
        </article>
      )}
    </section>
  );
}