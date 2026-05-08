export * from './colors';

export const DAYS_ES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

export const MONTHS_ES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];

export const BOOKING_STATUS_LABEL: Record<string, string> = {
  pending: 'Pendiente',
  confirmed: 'Confirmada',
  cancelled: 'Cancelada',
};

export const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente',
  confirmed: 'Confirmada',
  cancelled: 'Cancelada',
};

export const STATUS_VARIANTS: Record<string, 'warning' | 'success' | 'default'> = {
  pending: 'warning',
  confirmed: 'success',
  cancelled: 'default',
};

export interface BusinessTypeConfig {
  label: string;
  ionicon: string;
  setupTitle: string;
  setupSubtitle: string;
  placeholder: string;
  noServicesText: string;
  ownerLabel: string;
  bookingNotice: string;
  confirmLabel: string;
}

export const BUSINESS_TYPES: Record<string, BusinessTypeConfig> = {
  barbershop: {
    label: 'Barbería',
    ionicon: 'cut-outline',
    setupTitle: 'Configura tu barbería',
    setupSubtitle: 'Completa estos datos para que los clientes puedan encontrarte y reservar citas.',
    placeholder: 'Ej: Barbería El Padrino',
    noServicesText: 'Esta barbería no tiene servicios disponibles',
    ownerLabel: 'El barbero',
    bookingNotice: 'El barbero recibirá tu solicitud y la confirmará. Te avisaremos cuando esté lista.',
    confirmLabel: 'Barbería',
  },
  beauty_salon: {
    label: 'Salón de Belleza',
    ionicon: 'sparkles-outline',
    setupTitle: 'Configura tu salón',
    setupSubtitle: 'Completa estos datos para que los clientes puedan encontrarte y agendar citas.',
    placeholder: 'Ej: Salón María Nails',
    noServicesText: 'Este salón no tiene servicios disponibles',
    ownerLabel: 'El salón',
    bookingNotice: 'El salón recibirá tu solicitud y la confirmará. Te avisaremos cuando esté lista.',
    confirmLabel: 'Salón',
  },
  spa: {
    label: 'Spa',
    ionicon: 'leaf-outline',
    setupTitle: 'Configura tu spa',
    setupSubtitle: 'Completa estos datos para que los clientes puedan encontrarte y reservar sesiones.',
    placeholder: 'Ej: Spa Serenity',
    noServicesText: 'Este spa no tiene servicios disponibles',
    ownerLabel: 'El spa',
    bookingNotice: 'El spa recibirá tu solicitud y la confirmará. Te avisaremos cuando esté lista.',
    confirmLabel: 'Spa',
  },
  other: {
    label: 'Otro Negocio',
    ionicon: 'storefront-outline',
    setupTitle: 'Configura tu negocio',
    setupSubtitle: 'Completa estos datos para que los clientes puedan encontrarte y agendar citas.',
    placeholder: 'Ej: Centro de Bienestar',
    noServicesText: 'Este negocio no tiene servicios disponibles',
    ownerLabel: 'El negocio',
    bookingNotice: 'El negocio recibirá tu solicitud y la confirmará. Te avisaremos cuando esté lista.',
    confirmLabel: 'Negocio',
  },
};

export function getBusinessConfig(type?: string): BusinessTypeConfig {
  return BUSINESS_TYPES[type ?? 'barbershop'] ?? BUSINESS_TYPES.barbershop;
}
