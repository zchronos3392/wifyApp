const STORAGE_KEY = "wifyApp:nextCabeceraCorrelativo";

export function nextCabeceraCorrelativo(): number {
  const stored = localStorage.getItem(STORAGE_KEY);
  const current = stored ? Number.parseInt(stored, 10) : 0;
  const next = Number.isFinite(current) ? current + 1 : 1;
  localStorage.setItem(STORAGE_KEY, String(next));
  return next;
}

export function formatFecha(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function formatHora(date: Date): string {
  return date.toTimeString().slice(0, 8);
}
