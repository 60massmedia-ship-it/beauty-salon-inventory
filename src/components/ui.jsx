import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

export function Button({ children, type = 'button', className = '', onClick, disabled }) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex min-h-[44px] items-center justify-center rounded-2xl px-4 py-3 text-sm font-black transition hover:-translate-y-0.5 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    >
      {children}
    </button>
  );
}

export function Card({ children, className = '' }) {
  return <div className={`rounded-3xl border border-white/70 bg-white/85 shadow-sm backdrop-blur ${className}`}>{children}</div>;
}

export function Field({ label, children, helper, className = '' }) {
  return (
    <label className={`space-y-1 ${className}`}>
      <span className="text-sm font-black text-neutral-700">{label}</span>
      {children}
      {helper ? <p className="text-xs text-neutral-400">{helper}</p> : null}
    </label>
  );
}

export function TextInput(props) {
  return <input {...props} className={`w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 outline-none focus:border-neutral-950 ${props.className || ''}`} />;
}

export function SelectInput(props) {
  return <select {...props} className={`w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 outline-none focus:border-neutral-950 ${props.className || ''}`} />;
}

export function TextArea(props) {
  return <textarea {...props} className={`min-h-20 w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 outline-none focus:border-neutral-950 ${props.className || ''}`} />;
}

export function Modal({ title, subtitle, children, onCancel, onSave, saveText = '💾 บันทึกข้อมูล', maxWidth = 'max-w-xl', hideSave = false }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[2147483647] bg-black/75 pointer-events-auto">
      <div className="fixed inset-x-0 bottom-0 z-[2147483647] flex justify-center px-0 md:inset-x-0 md:top-[108px] md:bottom-0 md:overflow-y-auto md:px-3 md:pb-5">
        <div className={`relative flex h-[88dvh] w-full flex-col overflow-hidden rounded-t-[2rem] bg-white shadow-2xl ring-1 ring-black/10 md:my-4 md:h-auto md:max-h-[calc(100dvh-130px)] md:rounded-2xl ${maxWidth}`}>
          <div className="shrink-0 border-b border-neutral-100 bg-white px-5 pb-4 pt-3 md:py-4">
            <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-neutral-300 md:hidden" />
            <h3 className="text-lg font-black text-neutral-950 md:text-xl">{title}</h3>
            {subtitle ? <p className="mt-1 text-xs text-neutral-500">{subtitle}</p> : null}
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4">{children}</div>
          <div className={`shrink-0 grid gap-3 border-t border-neutral-100 bg-white px-5 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-4 shadow-[0_-8px_24px_rgba(0,0,0,0.08)] ${hideSave ? 'grid-cols-1' : 'grid-cols-2'}`}>
            <Button className="w-full border border-red-200 bg-red-50 py-3 text-red-700 hover:bg-red-100" onClick={onCancel}>{hideSave ? 'ปิด' : '✕ ยกเลิก'}</Button>
            {!hideSave ? <Button className="w-full bg-neutral-950 py-3 text-white hover:bg-neutral-800" onClick={onSave}>{saveText}</Button> : null}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
