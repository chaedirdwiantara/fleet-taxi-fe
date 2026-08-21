import { useState } from 'react';
import { Crosshair, Loader2, MapPin, Navigation, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { formatPin, homeMapUrl, parseHomePin, PIN_DECIMALS } from '../homeLocation';
import { useUpdateDriver } from '../hooks';
import type { DriverDetail } from '../types';
import { DocumentUploadCard } from './DocumentUploadCard';

// Survey Rumah — the house as it was surveyed: the photo, the written address,
// and an optional map pin. Address and pin save together (one PATCH); the photo
// rides the normal document upload flow. Opening the location prefers the pin
// and falls back to searching the address, so the link works from day one.

const PIN_PLACEHOLDER = '-6.229728, 106.689399 atau tempel link Google Maps';

export function HomeSurveyCard({ detail }: { detail: DriverDetail }) {
  const update = useUpdateDriver(detail.id);
  const [address, setAddress] = useState(detail.address ?? '');
  const [pinText, setPinText] = useState(
    detail.homeLat !== null && detail.homeLng !== null
      ? formatPin({ lat: detail.homeLat, lng: detail.homeLng })
      : '',
  );
  const [locating, setLocating] = useState(false);
  const [locateError, setLocateError] = useState<string | null>(null);

  const trimmedPin = pinText.trim();
  const pin = parseHomePin(trimmedPin);
  const pinInvalid = trimmedPin !== '' && pin === null;

  const savedPin =
    detail.homeLat !== null && detail.homeLng !== null
      ? formatPin({ lat: detail.homeLat, lng: detail.homeLng })
      : '';
  const dirty = address.trim() !== (detail.address ?? '') || trimmedPin !== savedPin;

  // The link follows what is SAVED, not what is being typed — a half-typed
  // coordinate must never send anyone to the wrong house.
  const mapUrl = homeMapUrl(detail);

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dirty || pinInvalid || update.isPending) return;
    update.mutate({
      address: address.trim(),
      homeLat: pin?.lat ?? null,
      homeLng: pin?.lng ?? null,
    });
  };

  /** Surveyor standing at the house: one tap instead of copying coordinates. */
  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocateError('Perangkat ini tidak mendukung deteksi lokasi.');
      return;
    }
    setLocateError(null);
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setPinText(
          formatPin({
            lat: Number(coords.latitude.toFixed(PIN_DECIMALS)),
            lng: Number(coords.longitude.toFixed(PIN_DECIMALS)),
          }),
        );
        setLocating(false);
      },
      () => {
        setLocateError('Gagal membaca lokasi — izinkan akses lokasi lalu coba lagi.');
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  };

  return (
    <Card className="py-4">
      <CardHeader className="px-4 pb-0">
        <CardTitle className="text-sm">Survey Rumah</CardTitle>
        <CardDescription>
          Foto rumah dan alamat hasil survey. Simpan titik lokasi agar alamat bisa langsung dibuka
          di peta.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 px-4">
        <DocumentUploadCard
          driverId={detail.id}
          kind="home_survey"
          document={detail.documents.find((d) => d.kind === 'home_survey')}
          showPreview
        />

        <form onSubmit={save} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="driver-home-address">Alamat Rumah</Label>
            <Textarea
              id="driver-home-address"
              rows={2}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Jl. Melati No. 1, RT 03 / RW 05, Jakarta Selatan"
              maxLength={250}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="driver-home-pin">
              Titik Lokasi <span className="font-normal text-muted-foreground">(opsional)</span>
            </Label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                id="driver-home-pin"
                value={pinText}
                onChange={(e) => setPinText(e.target.value)}
                placeholder={PIN_PLACEHOLDER}
                aria-invalid={pinInvalid}
                aria-describedby="driver-home-pin-hint"
                className="flex-1"
              />
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 sm:flex-none"
                  disabled={locating}
                  onClick={useCurrentLocation}
                >
                  {locating ? (
                    <Loader2 className="animate-spin" aria-hidden />
                  ) : (
                    <Crosshair aria-hidden />
                  )}
                  Lokasi Saya
                </Button>
                {pinText !== '' && (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    aria-label="Hapus titik lokasi"
                    onClick={() => setPinText('')}
                  >
                    <Trash2 />
                  </Button>
                )}
              </div>
            </div>
            <p
              id="driver-home-pin-hint"
              className={pinInvalid ? 'text-xs text-destructive' : 'text-xs text-muted-foreground'}
              role={pinInvalid ? 'alert' : undefined}
            >
              {pinInvalid
                ? 'Titik tidak terbaca. Isi "lintang, bujur" atau tempel link Google Maps yang lengkap (link pendek maps.app.goo.gl perlu dibuka dulu).'
                : 'Tempel link Google Maps atau isi "lintang, bujur". Kosongkan untuk memakai alamat saja.'}
            </p>
          </div>

          {update.isError && (
            <p className="text-sm text-destructive" role="alert">
              {update.error.message}
            </p>
          )}
          {locateError && (
            <p className="text-sm text-destructive" role="alert">
              {locateError}
            </p>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2">
            {mapUrl ? (
              <Button variant="outline" size="sm" asChild>
                <a href={mapUrl} target="_blank" rel="noreferrer">
                  <Navigation aria-hidden />
                  Buka di Peta
                </a>
              </Button>
            ) : (
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <MapPin className="size-3.5 shrink-0" aria-hidden />
                Isi alamat atau titik lokasi untuk membuka peta.
              </span>
            )}
            <Button type="submit" size="sm" disabled={!dirty || pinInvalid || update.isPending}>
              {update.isPending ? <Loader2 className="animate-spin" aria-hidden /> : null}
              Simpan Survey
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
