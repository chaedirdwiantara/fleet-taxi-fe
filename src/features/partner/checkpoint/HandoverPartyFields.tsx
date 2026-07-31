import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DriverCombobox } from './DriverCombobox';
import type { CreateCheckpointErrors } from './createCheckpointSchema';
import { handoverSides, type HandoverPartyNames, type HandoverType } from './types';

/**
 * The two sides of the handover, in signing order: penyerah first, penerima
 * second. Values are keyed by *role*, so switching the handover direction
 * keeps what the user typed where they typed it; the party mapping the API
 * stores happens once, at submit (`toPartyFields`).
 *
 * The side that is a driver is picked from the roster instead of typed, and
 * the phone belongs to — and sits with — the external party.
 */
export function HandoverPartyFields({
  handoverType,
  value,
  onChange,
  errors = {},
  idPrefix = 'cp',
}: {
  /** Empty until a handover type is chosen — the sides are unknown until then. */
  handoverType: HandoverType | '';
  value: HandoverPartyNames;
  onChange: (next: HandoverPartyNames) => void;
  /** Validation messages keyed by role, shown once the form was submitted. */
  errors?: CreateCheckpointErrors;
  idPrefix?: string;
}) {
  const sides = handoverType ? handoverSides(handoverType) : null;
  const patch = (next: Partial<HandoverPartyNames>) => onChange({ ...value, ...next });

  const phoneField = (partyLabel?: string) => (
    <div className="space-y-1.5">
      <Label htmlFor={`${idPrefix}-phone`}>
        Telepon
        {partyLabel && <span className="font-normal text-muted-foreground">· {partyLabel}</span>}
      </Label>
      <Input
        id={`${idPrefix}-phone`}
        value={value.counterpartPhone}
        onChange={(e) => patch({ counterpartPhone: e.target.value })}
        placeholder="0812xxxxxxx"
        maxLength={30}
        inputMode="tel"
        autoComplete="off"
        aria-invalid={!!errors.counterpartPhone}
      />
      {errors.counterpartPhone && (
        <p className="text-xs text-destructive">{errors.counterpartPhone}</p>
      )}
    </div>
  );

  return (
    <div className="space-y-3">
      {(['giver', 'receiver'] as const).map((role) => {
        const side = sides?.[role === 'giver' ? 0 : 1];
        const fieldId = `${idPrefix}-${role}`;
        const name = role === 'giver' ? value.giverName : value.receiverName;
        const error = role === 'giver' ? errors.giverName : errors.receiverName;
        const setName = (next: string) =>
          role === 'giver' ? patch({ giverName: next }) : patch({ receiverName: next });

        return (
          <div key={role} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor={fieldId}>
                Nama {role === 'giver' ? 'Penyerah' : 'Penerima'}
                {side && (
                  <span className="font-normal text-muted-foreground">· {side.partyLabel}</span>
                )}
              </Label>
              {side?.fromDriverRoster ? (
                <DriverCombobox
                  id={fieldId}
                  value={name}
                  invalid={!!error}
                  onChange={(driverName, driver) =>
                    patch({
                      ...(role === 'giver'
                        ? { giverName: driverName }
                        : { receiverName: driverName }),
                      // The driver is the external party — their number is the contact
                      ...(driver.phone ? { counterpartPhone: driver.phone } : {}),
                    })
                  }
                />
              ) : (
                <Input
                  id={fieldId}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={role === 'giver' ? 'Andi Pratama' : 'Budi Santoso'}
                  maxLength={120}
                  autoComplete="off"
                  aria-invalid={!!error}
                />
              )}
              {error && <p className="text-xs text-destructive">{error}</p>}
            </div>

            {/* Contact details belong to the external side, so they sit with it */}
            {side?.party === 'counterpart' && phoneField(side.partyLabel)}
          </div>
        );
      })}

      {/* No handover type yet: no side is known to own the phone */}
      {!sides && phoneField()}

      <p className="text-xs text-muted-foreground">
        Nama kedua pihak dicetak di bawah tanda tangan pada berita acara.
      </p>
    </div>
  );
}
