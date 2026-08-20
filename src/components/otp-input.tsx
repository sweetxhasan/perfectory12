import { OTPInput, REGEXP_ONLY_DIGITS, type SlotProps } from 'input-otp';
import { CutFrame } from '@/components/cut-frame';
import { cn } from '@/lib/utils';

/**
 * Every OTP entry field in the app (forgot-password reset code, email
 * verification code) renders through this one component. It's built on
 * top of `input-otp` — a single real `<input>` under the hood that the
 * library manages — instead of one `<input maxLength={1}>` per digit with
 * hand-rolled keydown/paste/focus wiring.
 *
 * That hand-rolled approach is what caused the reported bug: deleting a
 * digit required clicking directly into each box because focus-juggling
 * across N separate inputs on `Backspace` keydown is unreliable, especially
 * on mobile virtual keyboards (Android/Gboard often don't fire a
 * consistent `keydown` for Backspace at all). `input-otp` solves this at
 * the source — there is only one real input and one real caret, so holding
 * Backspace deletes digit-by-digit correctly on every device, deleting a
 * middle digit reflows the rest, and paste/autofill "just work" — without
 * any per-box focus management code to get wrong.
 */
export function CutOtpInput({
  length,
  value,
  onChange,
  onComplete,
  autoFocus,
  disabled,
  className,
  ariaLabel = 'Verification code',
}: {
  length: number;
  value: string;
  onChange: (value: string) => void;
  onComplete?: (value: string) => void;
  autoFocus?: boolean;
  disabled?: boolean;
  className?: string;
  ariaLabel?: string;
}) {
  return (
    <OTPInput
      value={value}
      onChange={onChange}
      onComplete={onComplete}
      maxLength={length}
      autoFocus={autoFocus}
      disabled={disabled}
      inputMode="numeric"
      pattern={REGEXP_ONLY_DIGITS}
      containerClassName={cn('flex justify-center gap-2 sm:gap-2.5', className)}
      aria-label={ariaLabel}
      render={({ slots }) => (
        <>
          {slots.map((slot, i) => (
            <CutOtpSlot key={i} slot={slot} />
          ))}
        </>
      )}
    />
  );
}

function CutOtpSlot({ slot }: { slot: SlotProps }) {
  return (
    <div
      className={cn(
        'pv-cut-field relative h-12 w-10 sm:h-14 sm:w-12',
        slot.isActive && 'pv-otp-slot-active',
      )}
    >
      <div className="pv-cut-bg" />
      <CutFrame />
      <div className="relative z-20 flex h-full w-full items-center justify-center text-lg font-bold text-foreground sm:text-xl">
        {slot.char}
        {slot.hasFakeCaret && (
          <div className="pv-otp-caret pointer-events-none h-5 w-px bg-foreground sm:h-6" />
        )}
      </div>
    </div>
  );
}
