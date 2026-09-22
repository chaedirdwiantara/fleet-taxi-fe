import { PenLine } from 'lucide-react';
import { cn } from '@/lib/utils';
import { resolveMediaUrl } from '../hooks';

/**
 * How the signing corner of the invoice will print: the signature over the
 * stamp's left edge (as a wet one lands), the officer's name, a rule, then
 * the title. Same composition as the PDF, so what the user previews is what
 * the customer receives. Paper-white on purpose — it previews a document,
 * so it stays white in dark mode too.
 */
export function SignatureBlockPreview({
  signatoryName,
  signatoryTitle,
  signatureUrl,
  stampUrl,
  className,
}: {
  signatoryName: string;
  signatoryTitle: string | null;
  signatureUrl: string | null;
  stampUrl: string | null;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex w-full max-w-56 flex-col items-center rounded-lg border bg-white px-4 py-3 text-slate-900',
        className,
      )}
      aria-label="Pratinjau blok tanda tangan"
    >
      <span className="text-xs text-slate-500">Hormat kami,</span>
      <div className="relative mt-1 h-16 w-40">
        {stampUrl && (
          <img
            src={resolveMediaUrl(stampUrl)}
            alt="Stempel"
            className="absolute top-0 right-2 size-16 object-contain"
          />
        )}
        {signatureUrl ? (
          <img
            src={resolveMediaUrl(signatureUrl)}
            alt="Tanda tangan"
            className="absolute top-1 left-0 h-14 w-28 object-contain"
          />
        ) : (
          <span className="absolute inset-0 flex items-center justify-center text-slate-300">
            <PenLine className="size-5" aria-hidden />
          </span>
        )}
      </div>
      <span className="mt-1 text-sm font-semibold">{signatoryName}</span>
      <span className="mt-1 w-40 border-t border-slate-400" aria-hidden />
      {signatoryTitle && (
        <span className="mt-1 text-center text-xs text-slate-500">{signatoryTitle}</span>
      )}
    </div>
  );
}
