import { create } from 'zustand';
import { Service, Barbershop } from '@/types';

interface BookingDraft {
  barbershop: Barbershop | null;
  services: Service[];
  date: Date | null;
  startTime: string | null;
}

interface BookingState {
  draft: BookingDraft;
  setDraftBarbershop: (shop: Barbershop) => void;
  setDraftServices: (services: Service[]) => void;
  setDraftDate: (date: Date) => void;
  setDraftTime: (time: string) => void;
  clearDraft: () => void;
}

const emptyDraft: BookingDraft = {
  barbershop: null,
  services: [],
  date: null,
  startTime: null,
};

export const useBookingStore = create<BookingState>((set) => ({
  draft: emptyDraft,

  setDraftBarbershop: (barbershop) =>
    set((s) => ({ draft: { ...s.draft, barbershop, services: [], date: null, startTime: null } })),

  setDraftServices: (services) =>
    set((s) => ({ draft: { ...s.draft, services, date: null, startTime: null } })),

  setDraftDate: (date) =>
    set((s) => ({ draft: { ...s.draft, date, startTime: null } })),

  setDraftTime: (startTime) =>
    set((s) => ({ draft: { ...s.draft, startTime } })),

  clearDraft: () => set({ draft: emptyDraft }),
}));
