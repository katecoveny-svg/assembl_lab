// Open-Meteo forecast and air quality. Key-less free tier is for non-commercial use (see live-sources.md).
import { getJSON, envelope, memo, round } from "./util.js";
import { placeOf } from "./places.js";

const SRC = { name: "Open-Meteo (MetService/ECMWF models)", url: "https://open-meteo.com/" };

export function parseWeather(j, p) {
  const c = j.current || {}, d = j.daily || {};
  if (c.temperature_2m == null) throw new Error("weather: no current temperature");
  return envelope({
    id: "weather", label: `Weather now, ${p.name}`, value: round(c.temperature_2m, 1), unit: "°C", asOf: c.time, period: "now",
    values: {
      place: p.name, at: c.time, tempC: c.temperature_2m, feelsC: c.apparent_temperature, humidity: c.relative_humidity_2m,
      windKmh: c.wind_speed_10m, cloudPct: c.cloud_cover, solarWm2: c.shortwave_radiation, isDay: !!c.is_day, rainMm: c.precipitation,
      today: { maxC: d.temperature_2m_max?.[0], minC: d.temperature_2m_min?.[0], rainMm: d.precipitation_sum?.[0], rainChancePct: d.precipitation_probability_max?.[0] },
      hourly: { time: j.hourly?.time || [], tempC: j.hourly?.temperature_2m || [], solarWm2: j.hourly?.shortwave_radiation || [] },
    },
    cadence: "hourly", source: SRC, live: true,
  });
}
export function fetchWeather({ place }) {
  const p = placeOf(place);
  const u = `https://api.open-meteo.com/v1/forecast?latitude=${p.lat}&longitude=${p.lon}&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,cloud_cover,shortwave_radiation,precipitation,is_day&hourly=temperature_2m,shortwave_radiation&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max&forecast_days=1&timezone=Pacific%2FAuckland`;
  return memo("weather:" + place, 10 * 60e3, async () => parseWeather(await getJSON(u), p));
}

export function parseAir(j, p) {
  const c = j.current || {};
  if (c.european_aqi == null && c.pm2_5 == null) throw new Error("air: no readings");
  const aqi = c.european_aqi, band = aqi == null ? null : aqi <= 20 ? "good" : aqi <= 40 ? "fair" : aqi <= 60 ? "moderate" : aqi <= 80 ? "poor" : aqi <= 100 ? "very poor" : "extremely poor";
  return envelope({
    id: "air", label: `Air quality, ${p.name}`, value: aqi ?? null, unit: "European AQI", asOf: c.time, period: "now",
    values: { pm25: round(c.pm2_5, 1), pm10: round(c.pm10, 1), aqi, band, at: c.time },
    cadence: "hourly", source: { name: "Open-Meteo air quality (CAMS model)", url: "https://open-meteo.com/en/docs/air-quality-api" }, live: true,
    note: "Modelled, not a measured station reading.",
  });
}
export function fetchAir({ place }) {
  const p = placeOf(place);
  const u = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${p.lat}&longitude=${p.lon}&current=pm2_5,pm10,european_aqi&timezone=Pacific%2FAuckland`;
  return memo("air:" + place, 20 * 60e3, async () => parseAir(await getJSON(u), p));
}
