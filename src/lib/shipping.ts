import type { CityKey, L, Zone } from "./types";

export type ZoneInfo = { name: L; cities: CityKey[]; baseCost: number; extraDays: number };

/** The shipping zone an enabled city belongs to. Used on the server (stored estimate) and in the checkout (live estimate). */
export const zoneFor = <T extends Pick<Zone, "cities">>(zones: T[], city: string | null | undefined): T | null => (city ? (zones.find((z) => z.cities.includes(city as CityKey)) ?? null) : null);
