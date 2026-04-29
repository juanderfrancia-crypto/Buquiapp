import { create } from 'zustand';
import { Service, Barbershop } from '@/types';

interface BookingDraft {
  barbershop: Barbershop | null;
  service: Service | null;
  date: Date | null;
  startTime: string | null;
}

interface BookingState {
  draft: BookingDraft;
  setDraftBarbershop: (shop: Barbershop) => void;
  setDraftService: (service: Service) => void;
  setDraftDate: (date: Date) => void;
  setDraftTime: (time: string) => void;
  clearDraft: () => void;
}

const emptyDraft: BookingDraft = {
  barbershop: null,
  service: null,
  date: null,
  startTime: null,
};

export const useBookingStore = create<BookingState>((set) => ({
  draft: emptyDraft,

  setDraftBarbershop: (barbershop) =>
    set((s) => ({ draft: { ...s.draft, barbershop, service: null, date: null, startTime: null } })),

  setDraftService: (service) =>
    set((s) => ({ draft: { ...s.draft, service, date: null, startTime: null } })),

  setDraftDate: (date) =>
    set((s) => ({ draft: { ...s.draft, date, startTime: null } })),

  setDraftTime: (startTime) =>
    set((s) => ({ draft: { ...s.draft, startTime } })),

  clearDraft: () => set({ draft: emptyDraft }),
}));
