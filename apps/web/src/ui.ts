// Shared Tailwind class names, so buttons and inputs look the same everywhere.
const focus = 'focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400';

export const buttonPrimary = `rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50 ${focus}`;
export const buttonSecondary = `rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50 ${focus}`;
export const inputClass = `rounded-lg border border-slate-300 bg-white px-3 py-2 ${focus}`;
