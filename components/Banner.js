'use client';

export default function Banner({ type = 'error', message, onClose }) {
  if (!message) return null;

  const isSuccess = type === 'success';

  return (
    <div
      className={`p-4 rounded-lg flex items-start justify-between border my-3 transition-all ${
        isSuccess
          ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
          : 'bg-rose-50 border-rose-300 text-rose-900'
      }`}
      role="alert"
    >
      <div className="flex items-center gap-2">
        <span className="font-semibold">{isSuccess ? '✓ Success:' : '⚠ Error:'}</span>
        <span>{message}</span>
      </div>
      {onClose && (
        <button
          onClick={onClose}
          type="button"
          className="ml-4 font-bold text-lg hover:opacity-75 focus:outline-none"
        >
          &times;
        </button>
      )}
    </div>
  );
}

