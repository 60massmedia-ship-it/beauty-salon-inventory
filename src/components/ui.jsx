import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

export function Button({ children, type = 'button', className = '', onClick, disabled }) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`premium-button inline-flex min-h-[48px] items-center justify-center rounded-[1.15rem] px-5 py-3 text-sm font-black tracking-[-0.01em] transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    >
      {children}
    </button>
  );
}

export function Card({ children, className = '' }) {
  return <div className={`premium-card rounded-[1.75rem] border bg-white/90 shadow-sm backdrop-blur-xl ${className}`}>{children}</div>;
}

export function Field({ label, children, helper, className = '' }) {
  return (
    <label className={`premium-field space-y-1.5 ${className}`}>
      <span className="text-[13px] font-black uppercase tracking-[0.02em] text-neutral-700">{label}</span>
      {children}
      {helper ? <p className="text-xs leading-relaxed text-neutral-400">{helper}</p> : null}
    </label>
  );
}

export function TextInput(props) {
  return <input {...props} className={`premium-input w-full rounded-[1.1rem] border bg-white px-4 py-3.5 text-sm outline-none transition ${props.className || ''}`} />;
}

export function SelectInput(props) {
  return <select {...props} className={`premium-input w-full rounded-[1.1rem] border bg-white px-4 py-3.5 text-sm outline-none transition ${props.className || ''}`} />;
}

export function TextArea(props) {
  return <textarea {...props} className={`premium-input min-h-24 w-full rounded-[1.1rem] border bg-white px-4 py-3.5 text-sm outline-none transition ${props.className || ''}`} />;
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
    <div className="fixed inset-0 z-[2147483647] bg-[#190016]/75 pointer-events-auto backdrop-blur-sm">
      <div className="fixed inset-x-0 bottom-0 z-[2147483647] flex justify-center px-0 md:inset-x-0 md:top-[92px] md:bottom-0 md:overflow-y-auto md:px-4 md:pb-6">
        <div className={`premium-modal relative flex h-[88dvh] w-full flex-col overflow-hidden rounded-t-[2rem] bg-white shadow-2xl ring-1 ring-pink-950/10 md:my-4 md:h-auto md:max-h-[calc(100dvh-120px)] md:rounded-[1.75rem] ${maxWidth}`}>
          <div className="premium-modal-header shrink-0 border-b px-5 pb-4 pt-3 md:px-6 md:py-5">
            <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-pink-200 md:hidden" />
            <h3 className="text-lg font-black tracking-[-0.02em] text-neutral-950 md:text-xl">{title}</h3>
            {subtitle ? <p className="mt-1 text-xs leading-relaxed text-neutral-500">{subtitle}</p> : null}
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5 md:px-6">{children}</div>
          <div className={`premium-modal-actions shrink-0 grid gap-3 border-t px-5 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-4 shadow-[0_-14px_30px_rgba(190,24,93,0.08)] md:px-6 ${hideSave ? 'grid-cols-1' : 'grid-cols-2'}`}>
            <Button className="w-full border border-rose-200 bg-rose-50 py-3 text-rose-700 hover:bg-rose-100" onClick={onCancel}>{hideSave ? 'ปิด' : '✕ ยกเลิก'}</Button>
            {!hideSave ? <Button className="w-full bg-neutral-950 py-3 text-white hover:bg-neutral-800" onClick={onSave}>{saveText}</Button> : null}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
