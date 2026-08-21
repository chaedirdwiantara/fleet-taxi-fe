/**
 * Home-survey location helpers.
 *
 * A written address alone is a poor map query in Indonesia (gang/RT-RW
 * addresses rarely geocode), so a driver's house is stored as an optional
 * lat/lng pin next to the address text. Opening the location prefers the pin
 * (an exact drop) and falls back to searching the address, which keeps the
 * feature useful before anyone has surveyed the house.
 *
 * Links use the official Google Maps URLs API — one URL that opens the web map
 * on desktop and hands off to the Maps app on Android/iOS.
 */

export interface HomePin {
  lat: number;
  lng: number;
}

const MAPS_SEARCH = 'https://www.google.com/maps/search/?api=1&query=';

/** Coordinates are stored with 6 decimals (~0.11 m) — enough for a house. */
export const PIN_DECIMALS = 6;

const inRange = (lat: number, lng: number) =>
  Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;

const round = (value: number) => Number(value.toFixed(PIN_DECIMALS));

/** "-6.229728, 106.689399" — the form we display and accept for round-tripping. */
export function formatPin(pin: HomePin): string {
  return `${pin.lat}, ${pin.lng}`;
}

/**
 * Reads a pin out of whatever the surveyor pasted: a bare "lat, lng" pair or a
 * Google Maps link. Both link shapes carry the coordinates in the URL — the
 * `@lat,lng,zoom` camera segment of a /maps/place link and the `q=`/`query=`
 * parameter of a share/search link. Shortened `maps.app.goo.gl` links resolve
 * only server-side, so they are rejected with a hint instead of guessed at.
 */
export function parseHomePin(raw: string): HomePin | null {
  const text = raw.trim();
  if (text === '') return null;

  const candidates = [text];
  if (/^https?:\/\//i.test(text)) {
    let url: URL;
    try {
      url = new URL(text);
    } catch {
      return null;
    }
    const param = url.searchParams.get('query') ?? url.searchParams.get('q');
    if (param) candidates.push(param);
    const camera = /@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/.exec(url.pathname);
    if (camera) candidates.push(`${camera[1]},${camera[2]}`);
    // /maps/place/…/data=!3d<lat>!4d<lng> — the place's own pin, more precise
    // than the camera centre when both are present.
    const place = /!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/.exec(text);
    if (place) candidates.unshift(`${place[1]},${place[2]}`);
  }

  for (const candidate of candidates) {
    const match = /^\s*(-?\d+(?:\.\d+)?)\s*[,;]\s*(-?\d+(?:\.\d+)?)\s*$/.exec(candidate);
    if (!match) continue;
    const lat = Number(match[1]);
    const lng = Number(match[2]);
    if (inRange(lat, lng)) return { lat: round(lat), lng: round(lng) };
  }
  return null;
}

/**
 * Map deep link for a driver's home, or null when there is nothing to open.
 * The pin wins over the address — it is the surveyed truth.
 */
export function homeMapUrl(home: {
  homeLat: number | null;
  homeLng: number | null;
  address: string | null;
}): string | null {
  if (home.homeLat !== null && home.homeLng !== null) {
    return `${MAPS_SEARCH}${home.homeLat},${home.homeLng}`;
  }
  const address = home.address?.trim();
  return address ? `${MAPS_SEARCH}${encodeURIComponent(address)}` : null;
}
