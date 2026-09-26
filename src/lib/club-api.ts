import { request } from "./api";
export type ClubPhoto = {
  id: string;
  url: string;
  caption: string | null;
  position: number;
  active: boolean;
};
export type ClubKiosk = {
  id: string;
  name: string;
  description: string;
  capacity: number;
  barbecue: boolean;
  electricity: boolean;
  nearby: string | null;
  price: string;
  latitude: string | number;
  longitude: string | number;
  status: string;
  notes: string | null;
  photos: ClubPhoto[];
};
export type ClubReservation = {
  id: string;
  kiosk: ClubKiosk;
  startsAt: string;
  endsAt: string;
  people: number;
  amount: string;
  status: string;
  cardMasked: string;
  paymentMode: string | null;
  history: Array<{
    id: string;
    createdAt: string;
    reason: string;
    status: string;
  }>;
};
export type ClubActivity = {
  id: string;
  name: string;
  description: string;
  imageUrl: string | null;
  startsAt: string | null;
  active: boolean;
};
export type ClubPage<T> = {
  data: T[];
  pagination: { page: number; pages: number; total: number };
};
const call = (path: string, method = "GET", body?: unknown) =>
  request("/club-admin" + path, {
    method,
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
export const clubApi = {
  dashboard: () => call("/dashboard"),
  kiosks: (query = "") =>
    call("/kiosks?" + query) as Promise<ClubPage<ClubKiosk>>,
  kiosk: (id: string) => call("/kiosks/" + id) as Promise<ClubKiosk>,
  saveKiosk: (id: string | undefined, data: unknown) =>
    call("/kiosks" + (id ? "/" + id : ""), id ? "PUT" : "POST", data),
  addPhoto: (id: string, data: unknown) =>
    call(`/kiosks/${id}/photos`, "POST", data),
  editPhoto: (id: string, photoId: string, data: unknown) =>
    call(`/kiosks/${id}/photos/${photoId}`, "PATCH", data),
  reservations: (query = "") =>
    call("/reservations?" + query) as Promise<ClubPage<ClubReservation>>,
  agenda: (id: string, query: string) =>
    call(`/kiosks/${id}/agenda?${query}`) as Promise<ClubReservation[]>,
  status: (id: string, status: string, reason: string) =>
    call(`/reservations/${id}/status`, "PATCH", { status, reason }),
  audit: (query = "") => call("/audit?" + query),
  activities: () => call("/activities?limit=100") as Promise<ClubActivity[]>,
  saveActivity: (id: string | undefined, data: unknown) =>
    call("/activities" + (id ? "/" + id : ""), id ? "PUT" : "POST", data),
};
