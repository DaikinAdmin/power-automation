'use client';

import { Loader2, Lock, CheckCircle2 } from 'lucide-react';

interface PaymentButtonProps {
  isThisLoading: boolean;
  disabled: boolean;
  isCompleted: boolean;
  onClick: () => void;
  processingLabel: string;
  alreadyPaidLabel: string;
}

/* ─────────────────────────────────────────── Przelewy24 ── */
export function Przelewy24Button({
  isThisLoading,
  disabled,
  isCompleted,
  onClick,
  processingLabel,
  alreadyPaidLabel,
}: PaymentButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || isCompleted}
      className="w-full bg-[#c8232c] text-white py-4 px-6 rounded-lg font-semibold hover:bg-[#a01c24] disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
    >
      {isThisLoading ? (
        <>
          <Loader2 className="w-5 h-5 animate-spin" />
          {processingLabel}
        </>
      ) : isCompleted ? (
        <>
          <CheckCircle2 className="w-5 h-5" />
          {alreadyPaidLabel}
        </>
      ) : (
        <>
          <Lock className="w-5 h-5" />
          {/* Przelewy24 branding */}
          <span>Zapłać przez</span>
          <span className="font-black tracking-tight">Przelewy24</span>
        </>
      )}
    </button>
  );
}

/* ─────────────────────────────────────────────── LiqPay ── */
export function LiqPayButton({
  isThisLoading,
  disabled,
  isCompleted,
  onClick,
  processingLabel,
  alreadyPaidLabel,
}: PaymentButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || isCompleted}
      className="w-full bg-[#77cc5d] text-white py-4 px-6 rounded-lg font-semibold hover:bg-[#5fb347] disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
    >
      {isThisLoading ? (
        <>
          <Loader2 className="w-5 h-5 animate-spin" />
          {processingLabel}
        </>
      ) : isCompleted ? (
        <>
          <CheckCircle2 className="w-5 h-5" />
          {alreadyPaidLabel}
        </>
      ) : (
        <>
          <Lock className="w-5 h-5" />
          {/* LiqPay branding */}
          <span>Сплатити через</span>
          <span className="font-black tracking-tight">LiqPay</span>
        </>
      )}
    </button>
  );
}

/* ──────────────────────────────────────────── Privat24 ── */
export function Privat24Button({
  isThisLoading,
  disabled,
  isCompleted,
  onClick,
  processingLabel,
  alreadyPaidLabel,
}: PaymentButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || isCompleted}
      className="w-full bg-[#1d4289] text-white py-4 px-6 rounded-lg font-semibold hover:bg-[#163268] disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
    >
      {isThisLoading ? (
        <>
          <Loader2 className="w-5 h-5 animate-spin" />
          {processingLabel}
        </>
      ) : isCompleted ? (
        <>
          <CheckCircle2 className="w-5 h-5" />
          {alreadyPaidLabel}
        </>
      ) : (
        <>
          <Lock className="w-5 h-5" />
          {/* Privat24 branding */}
          <span>Оплата частинами в</span>
          <span className="font-black tracking-tight">Privat24</span>
        </>
      )}
    </button>
  );
}
