'use client';

import { useState } from 'react';
import { Loader2, Lock, CheckCircle2, FileText } from 'lucide-react';

interface PaymentButtonProps {
  isThisLoading: boolean;
  disabled: boolean;
  isCompleted: boolean;
  onClick: () => void;
  processingLabel: string;
  alreadyPaidLabel: string;
  label?: string;
}

/* ─────────────────────────────────────────── Przelewy24 ── */
export function Przelewy24Button({
  isThisLoading,
  disabled,
  isCompleted,
  onClick,
  processingLabel,
  alreadyPaidLabel,
  label,
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
          {label ?? (
            <>
              <span>Zapłać przez</span>
              <span className="font-black tracking-tight">Przelewy24</span>
            </>
          )}
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
  label,
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
          {label ?? (
            <>
              <span>Сплатити через</span>
              <span className="font-black tracking-tight">LiqPay</span>
            </>
          )}
        </>
      )}
    </button>
  );
}

/* ──────────────────────────────────────── IssueInvoice ── */
interface IssueInvoiceButtonProps {
  orderId: string;
  disabled: boolean;
  label: string;
  processingLabel: string;
}

export function IssueInvoiceButton({
  orderId,
  disabled,
  label,
  processingLabel,
}: IssueInvoiceButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [error, setError] = useState('');

  const handleClick = async () => {
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/payments/invoice/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to request invoice');
      }

      setIsDone(true);
    } catch (err: any) {
      setError(err.message || 'Failed to request invoice');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-1">
      <button
        onClick={handleClick}
        disabled={disabled || isLoading || isDone}
        className="w-full bg-gray-700 text-white py-4 px-6 rounded-lg font-semibold hover:bg-gray-800 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
      >
        {isLoading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            {processingLabel}
          </>
        ) : isDone ? (
          <>
            <CheckCircle2 className="w-5 h-5" />
            {label}
          </>
        ) : (
          <>
            <FileText className="w-5 h-5" />
            {label}
          </>
        )}
      </button>
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}

