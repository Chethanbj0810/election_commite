'use client';

export default function Loading({ text = 'Loading...' }) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-slate-500">
      <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-3"></div>
      <p className="text-sm font-medium">{text}</p>
    </div>
  );
}

