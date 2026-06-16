"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  formatFecha,
  formatHora,
  nextCabeceraCorrelativo,
} from "./lib/correlativo";
import type {
  CabeceraForm,
  RegistroCabecera,
  RegistroDetalle,
} from "./types/registro";

const LUGAR_LABELS = [
  { key: "lugar1" as const, label: "Lugar 1", hint: "General", placeholder: "Ej: Casa" },
  { key: "lugar2" as const, label: "Lugar 2", hint: "Nivel", placeholder: "Ej: Primer piso" },
  { key: "lugar3" as const, label: "Lugar 3", hint: "Ambiente", placeholder: "Ej: Habitación 1" },
  { key: "lugar4" as const, label: "Lugar 4", hint: "Sector", placeholder: "Ej: Esquina norte" },
];

const EMPTY_FORM: CabeceraForm = {
  lugar1: "",
  lugar2: "",
  lugar3: "",
  lugar4: "",
};

function nowIso() {
  return new Date().toISOString();
}

async function getPosition(): Promise<GeolocationPosition> {
  return await new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocalización no disponible en este dispositivo."));
      return;
    }

    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 7000,
      maximumAge: 0,
    });
  });
}

export default function Home() {
  const [form, setForm] = useState<CabeceraForm>(EMPTY_FORM);
  const [cabeceraActiva, setCabeceraActiva] = useState<RegistroCabecera | null>(null);
  const [detalles, setDetalles] = useState<RegistroDetalle[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const timerRef = useRef<number | null>(null);
  const detalleCounterRef = useRef(0);
  const cabeceraRef = useRef<RegistroCabecera | null>(null);

  const canStart = !isRunning && form.lugar1.trim().length > 0;
  const canStop = isRunning;
  const formLocked = isRunning;

  const status = useMemo(
    () => ({
      total: detalles.length,
      running: isRunning,
    }),
    [detalles.length, isRunning],
  );

  function updateForm(field: keyof CabeceraForm, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function captureOnce() {
    const cabecera = cabeceraRef.current;
    if (!cabecera) return;

    try {
      setLastError(null);
      const pos = await getPosition();
      detalleCounterRef.current += 1;

      const next: RegistroDetalle = {
        correlativoDetalle: detalleCounterRef.current,
        fecha: cabecera.fecha,
        horaInicioRegistro: cabecera.horaInicio,
        correlativoCabecera: cabecera.correlativo,
        capturedAt: nowIso(),
        lat: Number.isFinite(pos.coords.latitude) ? pos.coords.latitude : null,
        lng: Number.isFinite(pos.coords.longitude) ? pos.coords.longitude : null,
        accuracyM: Number.isFinite(pos.coords.accuracy) ? pos.coords.accuracy : null,
        wifiRssiDbm: null,
      };

      setDetalles((prev) => [next, ...prev]);
    } catch (err) {
      setLastError(err instanceof Error ? err.message : "Error desconocido.");
    }
  }

  function start() {
    if (timerRef.current != null || !form.lugar1.trim()) return;

    const now = new Date();
    const cabecera: RegistroCabecera = {
      fecha: formatFecha(now),
      horaInicio: formatHora(now),
      correlativo: nextCabeceraCorrelativo(),
      lugar1: form.lugar1.trim(),
      lugar2: form.lugar2.trim(),
      lugar3: form.lugar3.trim(),
      lugar4: form.lugar4.trim(),
      horaFin: null,
    };

    cabeceraRef.current = cabecera;
    detalleCounterRef.current = 0;
    setCabeceraActiva(cabecera);
    setDetalles([]);
    setIsRunning(true);

    void captureOnce();
    timerRef.current = window.setInterval(() => {
      void captureOnce();
    }, 1000);
  }

  function stop() {
    setIsRunning(false);
    if (timerRef.current != null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }

    const now = new Date();
    setCabeceraActiva((prev) =>
      prev ? { ...prev, horaFin: formatHora(now) } : null,
    );
    cabeceraRef.current = null;
  }

  function clear() {
    if (isRunning) return;
    setForm(EMPTY_FORM);
    setCabeceraActiva(null);
    setDetalles([]);
    setLastError(null);
    detalleCounterRef.current = 0;
    cabeceraRef.current = null;
  }

  useEffect(() => {
    return () => {
      if (timerRef.current != null) {
        window.clearInterval(timerRef.current);
      }
    };
  }, []);

  return (
    <main className="mx-auto w-full max-w-5xl p-6 space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">Análisis de señal WiFi</h1>
        <p className="text-sm text-zinc-600">
          Completá la ubicación, activá el análisis y se registrarán muestras cada 1 segundo.
        </p>
      </header>

      <section className="rounded-md border border-zinc-200 p-4 space-y-4">
        <div>
          <h2 className="text-lg font-medium">Registro cabecera</h2>
          <p className="text-sm text-zinc-600">
            De general a específico: edificio → piso → habitación → sector.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {LUGAR_LABELS.map(({ key, label, hint, placeholder }) => (
            <label key={key} className="block space-y-1">
              <span className="text-sm font-medium text-zinc-800">
                {label}
                <span className="ml-1 font-normal text-zinc-500">({hint})</span>
                {key === "lugar1" ? (
                  <span className="ml-1 text-red-600">*</span>
                ) : null}
              </span>
              <input
                type="text"
                value={form[key]}
                onChange={(e) => updateForm(key, e.target.value)}
                placeholder={placeholder}
                disabled={formLocked}
                className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm disabled:bg-zinc-100 disabled:text-zinc-500"
              />
            </label>
          ))}
        </div>

        {cabeceraActiva ? (
          <div className="rounded-md bg-zinc-50 p-3 text-sm text-zinc-700 space-y-1">
            <p>
              <span className="font-medium">Sesión #{cabeceraActiva.correlativo}</span>
              <span className="mx-2 text-zinc-400">|</span>
              {cabeceraActiva.fecha} {cabeceraActiva.horaInicio}
              {cabeceraActiva.horaFin ? ` → ${cabeceraActiva.horaFin}` : " (en curso)"}
            </p>
            <p>
              {[cabeceraActiva.lugar1, cabeceraActiva.lugar2, cabeceraActiva.lugar3, cabeceraActiva.lugar4]
                .filter(Boolean)
                .join(" › ")}
            </p>
          </div>
        ) : null}
      </section>

      <section className="flex flex-wrap gap-3 items-center">
        <button
          type="button"
          onClick={start}
          disabled={!canStart}
          className="rounded-md bg-zinc-900 px-4 py-2 text-white disabled:opacity-50"
        >
          Activar análisis
        </button>
        <button
          type="button"
          onClick={stop}
          disabled={!canStop}
          className="rounded-md border border-zinc-300 px-4 py-2 disabled:opacity-50"
        >
          Fin análisis
        </button>
        <button
          type="button"
          onClick={clear}
          disabled={isRunning}
          className="rounded-md border border-zinc-300 px-4 py-2 disabled:opacity-50"
        >
          Limpiar
        </button>

        <div className="ml-auto text-sm text-zinc-700">
          <span className="font-medium">{status.running ? "En curso" : "Detenido"}</span>
          <span className="mx-2 text-zinc-400">|</span>
          <span>{status.total} registros detalle</span>
        </div>
      </section>

      {!form.lugar1.trim() && !isRunning ? (
        <p className="text-sm text-amber-700">
          Completá al menos <span className="font-medium">Lugar 1</span> para poder activar el análisis.
        </p>
      ) : null}

      {lastError ? (
        <section className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-900">
          {lastError}
        </section>
      ) : null}

      <section className="overflow-auto rounded-md border border-zinc-200">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-white">
            <tr className="text-left border-b border-zinc-200">
              <th className="p-3">#</th>
              <th className="p-3">Hora (ISO)</th>
              <th className="p-3">Lat</th>
              <th className="p-3">Lng</th>
              <th className="p-3">Precisión (m)</th>
              <th className="p-3">WiFi RSSI (dBm)</th>
            </tr>
          </thead>
          <tbody>
            {detalles.length === 0 ? (
              <tr>
                <td className="p-3 text-zinc-500" colSpan={6}>
                  Sin registros detalle. Completá la cabecera y presioná “Activar análisis”.
                </td>
              </tr>
            ) : (
              detalles.map((d) => (
                <tr key={`${d.correlativoCabecera}-${d.correlativoDetalle}`} className="border-b border-zinc-100">
                  <td className="p-3 font-mono">{d.correlativoDetalle}</td>
                  <td className="p-3 font-mono">{d.capturedAt}</td>
                  <td className="p-3 font-mono">{d.lat ?? "—"}</td>
                  <td className="p-3 font-mono">{d.lng ?? "—"}</td>
                  <td className="p-3 font-mono">{d.accuracyM ?? "—"}</td>
                  <td className="p-3 font-mono">{d.wifiRssiDbm ?? "N/D"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
    </main>
  );
}
