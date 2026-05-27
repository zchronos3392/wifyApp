"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Sample = {
  id: string;
  capturedAt: string;
  lat: number | null;
  lng: number | null;
  accuracyM: number | null;
  wifiRssiDbm: number | null;
};

function nowIso() {
  return new Date().toISOString();
}

function uid() {
  return crypto.randomUUID();
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
  const [isRunning, setIsRunning] = useState(false);
  const [samples, setSamples] = useState<Sample[]>([]);
  const [lastError, setLastError] = useState<string | null>(null);
  const timerRef = useRef<number | null>(null);

  const canStart = !isRunning;
  const canStop = isRunning;

  const header = useMemo(() => {
    return {
      total: samples.length,
      running: isRunning,
    };
  }, [isRunning, samples.length]);

  async function captureOnce() {
    try {
      setLastError(null);
      const pos = await getPosition();

      const next: Sample = {
        id: uid(),
        capturedAt: nowIso(),
        lat: Number.isFinite(pos.coords.latitude) ? pos.coords.latitude : null,
        lng: Number.isFinite(pos.coords.longitude) ? pos.coords.longitude : null,
        accuracyM: Number.isFinite(pos.coords.accuracy) ? pos.coords.accuracy : null,
        wifiRssiDbm: null, // Placeholder: en web no hay API estándar para leer RSSI WiFi
      };

      setSamples((prev) => [next, ...prev]);
    } catch (err) {
      setLastError(err instanceof Error ? err.message : "Error desconocido.");
    }
  }

  function start() {
    if (timerRef.current != null) return;
    setIsRunning(true);

    // Captura inmediata + luego cada 1s
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
  }

  function clear() {
    setSamples([]);
    setLastError(null);
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
          Captura cada 1s: geolocalización (lat/lng/precisión) + RSSI WiFi (pendiente).
        </p>
      </header>

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
          className="rounded-md border border-zinc-300 px-4 py-2"
        >
          Limpiar
        </button>

        <div className="ml-auto text-sm text-zinc-700">
          <span className="font-medium">{header.running ? "En curso" : "Detenido"}</span>
          <span className="mx-2 text-zinc-400">|</span>
          <span>{header.total} registros</span>
        </div>
      </section>

      {lastError ? (
        <section className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-900">
          {lastError}
        </section>
      ) : null}

      <section className="overflow-auto rounded-md border border-zinc-200">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-white">
            <tr className="text-left border-b border-zinc-200">
              <th className="p-3">Hora (ISO)</th>
              <th className="p-3">Lat</th>
              <th className="p-3">Lng</th>
              <th className="p-3">Precisión (m)</th>
              <th className="p-3">WiFi RSSI (dBm)</th>
            </tr>
          </thead>
          <tbody>
            {samples.length === 0 ? (
              <tr>
                <td className="p-3 text-zinc-500" colSpan={5}>
                  Sin registros. Presiona “Activar análisis”.
                </td>
              </tr>
            ) : (
              samples.map((s) => (
                <tr key={s.id} className="border-b border-zinc-100">
                  <td className="p-3 font-mono">{s.capturedAt}</td>
                  <td className="p-3 font-mono">{s.lat ?? "—"}</td>
                  <td className="p-3 font-mono">{s.lng ?? "—"}</td>
                  <td className="p-3 font-mono">{s.accuracyM ?? "—"}</td>
                  <td className="p-3 font-mono">{s.wifiRssiDbm ?? "N/D"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
    </main>
  );
}
