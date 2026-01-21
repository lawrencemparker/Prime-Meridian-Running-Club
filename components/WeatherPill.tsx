"use client";

import { useEffect, useMemo, useState } from "react";
import { Card } from "./ui/Card";

type WeatherState =
  | { status: "loading" }
  | { status: "denied" }
  | { status: "error"; message: string }
  | {
      status: "ready";
      tempF: number;
      icon: string;
      label: string;
      place?: string;
      hiF?: number;
      loF?: number;
    };

function codeToIconLabel(code: number, isDay: boolean) {
  // Open-Meteo weather codes
  if (code === 0) return { icon: isDay ? "☀️" : "🌙", label: "Clear" };
  if (code === 1) return { icon: isDay ? "🌤️" : "☁️", label: "Mostly clear" };
  if (code === 2) return { icon: "⛅", label: "Partly cloudy" };
  if (code === 3) return { icon: "☁️", label: "Overcast" };
  if (code === 45 || code === 48) return { icon: "🌫️", label: "Fog" };

  if ([51, 53, 55].includes(code)) return { icon: "🌦️", label: "Drizzle" };
  if ([56, 57].includes(code)) return { icon: "🌧️", label: "Freezing drizzle" };

  if ([61, 63, 65].includes(code)) return { icon: "🌧️", label: "Rain" };
  if ([66, 67].includes(code)) return { icon: "🌧️", label: "Freezing rain" };

  if ([71, 73, 75].includes(code)) return { icon: "❄️", label: "Snow" };
  if (code === 77) return { icon: "❄️", label: "Snow grains" };

  if ([80, 81, 82].includes(code)) return { icon: "🌧️", label: "Showers" };
  if ([85, 86].includes(code)) return { icon: "❄️", label: "Snow showers" };

  if (code === 95) return { icon: "⛈️", label: "Thunderstorm" };
  if ([96, 99].includes(code)) return { icon: "⛈️", label: "Storm + hail" };

  return { icon: "🌤️", label: "Weather" };
}

async function reverseGeocode(
  lat: number,
  lon: number
): Promise<string | undefined> {
  // No-key reverse geocode using Open-Meteo’s geocoding endpoint.
  // IMPORTANT: This must never throw; weather should still render if it fails.
  const url = `https://geocoding-api.open-meteo.com/v1/reverse?latitude=${lat}&longitude=${lon}&language=en&count=1`;

  try {
    const res = await fetch(url);
    if (!res.ok) return undefined;
    const data = await res.json();
    const r = data?.results?.[0];
    if (!r) return undefined;

    const name = String(r.name ?? "").trim();
    const admin1 = String(r.admin1 ?? "").trim(); // state/province
    if (name && admin1) return `${name}, ${admin1}`;
    if (name) return name;
    return undefined;
  } catch {
    return undefined;
  }
}

export function WeatherPill({ showPlace = true }: { showPlace?: boolean }) {
  const [state, setState] = useState<WeatherState>({ status: "loading" });

  const content = useMemo(() => {
    if (state.status === "loading") {
      return (
        <Card className="px-4 py-3 flex items-center justify-between">
          <div className="text-[12px] text-black/45 tracking-[0.18em] uppercase">
            Weather
          </div>
          <div className="h-5 w-28 rounded-full bg-black/5 animate-pulse" />
        </Card>
      );
    }

    if (state.status === "denied") {
      return (
        <Card className="px-4 py-3 flex items-center justify-between">
          <div className="text-[13px] text-black/55">
            Enable location to show weather
          </div>
          <div className="text-[12px] text-black/40">Location off</div>
        </Card>
      );
    }

    if (state.status === "error") {
      return (
        <Card className="px-4 py-3 flex items-center justify-between">
          <div className="text-[13px] text-black/55">Weather unavailable</div>
          <div className="text-[12px] text-black/40">{state.message}</div>
        </Card>
      );
    }

    return (
      <Card className="px-4 py-3 flex items-center justify-between">
        <div className="min-w-0">
          <div className="text-[12px] text-black/45 tracking-[0.18em] uppercase">
            Weather
          </div>
          {showPlace && state.place ? (
            <div className="mt-0.5 text-[12px] text-black/45 truncate">
              {state.place}
            </div>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          <div className="text-[16px]">{state.icon}</div>
          <div className="text-[14px] font-semibold">{state.tempF}°</div>
          <div className="text-[12px] text-black/45">{state.label}</div>

          {typeof state.hiF === "number" && typeof state.loF === "number" ? (
            <div className="ml-2 text-[12px] text-black/35">
              H {state.hiF}° · L {state.loF}°
            </div>
          ) : null}
        </div>
      </Card>
    );
  }, [state, showPlace]);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (!navigator.geolocation) {
        if (!cancelled) setState({ status: "denied" });
        return;
      }

      setState({ status: "loading" });

      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          try {
            const { latitude, longitude } = pos.coords;

            const weatherUrl =
              `https://api.open-meteo.com/v1/forecast?latitude=${latitude}` +
              `&longitude=${longitude}` +
              `&current=temperature_2m,weather_code,is_day` +
              `&daily=temperature_2m_max,temperature_2m_min` +
              `&timezone=auto` +
              `&temperature_unit=fahrenheit`;

            const weatherPromise = fetch(weatherUrl).then(async (r) => {
              if (!r.ok) throw new Error("weather");
              return r.json();
            });

            const placePromise = showPlace
              ? reverseGeocode(latitude, longitude)
              : Promise.resolve(undefined);

            // Critical: place failure must not break weather
            const [weatherRes, placeRes] = await Promise.allSettled([
              weatherPromise,
              placePromise,
            ]);

            if (weatherRes.status !== "fulfilled") {
              if (!cancelled) setState({ status: "error", message: "Try again" });
              return;
            }

            const weather = weatherRes.value;
            const place =
              placeRes.status === "fulfilled" ? placeRes.value : undefined;

            const tempF = Math.round(Number(weather?.current?.temperature_2m ?? 0));
            const code = Number(weather?.current?.weather_code ?? 0);
            const isDay = Boolean(weather?.current?.is_day ?? 1);

            const hiF = weather?.daily?.temperature_2m_max?.[0];
            const loF = weather?.daily?.temperature_2m_min?.[0];

            const hi = typeof hiF === "number" ? Math.round(hiF) : undefined;
            const lo = typeof loF === "number" ? Math.round(loF) : undefined;

            const { icon, label } = codeToIconLabel(code, isDay);

            if (!cancelled) {
              setState({
                status: "ready",
                tempF,
                icon,
                label,
                place,
                hiF: hi,
                loF: lo,
              });
            }
          } catch {
            if (!cancelled) setState({ status: "error", message: "Try again" });
          }
        },
        (err) => {
          if (!cancelled) {
            if (err.code === err.PERMISSION_DENIED) setState({ status: "denied" });
            else setState({ status: "error", message: "Location error" });
          }
        },
        { enableHighAccuracy: false, timeout: 7000, maximumAge: 5 * 60 * 1000 }
      );
    }

    run();
    const interval = setInterval(run, 20 * 60 * 1000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [showPlace]);

  return content;
}
