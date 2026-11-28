/**
 * Cloudflare Pages Function: /api/linz
 * Proxies LINZ Data Service WFS GeoJSON requests (EPSG:4326) using env.LINZ_API_KEY
 * when configured, and automatically falls back to keyless public LINZ ArcGIS mirror
 * feeds via `api/_feeds/handle.js` when LINZ_API_KEY is not set.
 *
 * Supported layers:
 *   - 50772  : NZ Primary Parcels
 *   - 101290 : NZ Building Outlines
 */
import { handleLive } from '../../api/_feeds/handle.js';

export const ALLOWED_LAYERS = new Set(['50772', '101290']);

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function jsonResponse(body, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...CORS_HEADERS,
      ...extraHeaders,
    },
  });
}

/**
 * Parse "minLon,minLat,maxLon,maxLat[,EPSG:4326]" into numeric bounds + centre.
 * Returns null if malformed.
 */
export function parseBbox(rawBbox) {
  const parts = String(rawBbox || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (parts.length < 4) return null;
  const nums = parts.slice(0, 4).map(Number);
  if (nums.some((n) => !Number.isFinite(n))) return null;
  const [minLon, minLat, maxLon, maxLat] = nums;
  if (maxLon <= minLon || maxLat <= minLat) return null;
  return {
    minLon,
    minLat,
    maxLon,
    maxLat,
    lat: +((minLat + maxLat) / 2).toFixed(6),
    lon: +((minLon + maxLon) / 2).toFixed(6),
    bbox4: `${minLon},${minLat},${maxLon},${maxLat}`,
  };
}

/** Convert `feeds.site` keyless envelope into a standard GeoJSON FeatureCollection for layer 50772. */
export function siteEnvelopeToGeoJSON(siteFeed) {
  const parcel = siteFeed?.facts?.parcel?.values;
  const features = [];
  if (parcel?.outline && (parcel.outline.type === 'Polygon' || parcel.outline.type === 'MultiPolygon')) {
    features.push({
      type: 'Feature',
      id: parcel.parcelId ?? 'parcel-0',
      geometry: parcel.outline,
      properties: {
        id: parcel.parcelId ?? null,
        parcel_intent: parcel.intent ?? null,
        land_district: parcel.landDistrict ?? null,
        calc_area: parcel.calcAreaM2 ?? null,
        survey_area: parcel.surveyAreaM2 ?? null,
        source: 'LINZ NZ Primary Parcels (keyless mirror)',
      },
    });
  }
  return {
    type: 'FeatureCollection',
    layer: '50772',
    via: 'keyless-mirror',
    features,
  };
}

/** Convert `feeds.footprint` keyless envelope into a standard GeoJSON FeatureCollection for layer 101290. */
export function footprintEnvelopeToGeoJSON(footprintFeed) {
  const geo = footprintFeed?.values?.geojson;
  return {
    type: 'FeatureCollection',
    layer: '101290',
    via: footprintFeed?.values?.via || 'keyless-mirror',
    features: Array.isArray(geo?.features) ? geo.features : [],
  };
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}

export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const layer = (url.searchParams.get('layer') || '').trim();
  const rawBbox = (url.searchParams.get('bbox') || '').trim();

  if (!ALLOWED_LAYERS.has(layer)) {
    return jsonResponse(
      { error: 'Invalid or missing layer parameter. Allowed layers: 50772, 101290.' },
      400
    );
  }

  if (!rawBbox) {
    return jsonResponse(
      { error: 'Missing required bbox parameter (minLon,minLat,maxLon,maxLat[,EPSG:4326]).' },
      400
    );
  }

  const parsed = parseBbox(rawBbox);
  if (!parsed) {
    return jsonResponse(
      { error: 'Malformed bbox parameter. Expected minLon,minLat,maxLon,maxLat[,EPSG:4326].' },
      400
    );
  }

  const apiKey = (env?.LINZ_API_KEY || '').trim();
  const defaultCount = layer === '50772' ? '8' : '12';
  const count = (url.searchParams.get('count') || defaultCount).trim();

  // 1. Keyed LINZ Data Service WFS when LINZ_API_KEY is configured
  if (apiKey) {
    const bbox = rawBbox.includes('EPSG:') ? rawBbox : `${parsed.bbox4},EPSG:4326`;
    const wfsUrl =
      `https://data.linz.govt.nz/services;key=${encodeURIComponent(apiKey)}/wfs` +
      `?service=WFS&version=2.0.0&request=GetFeature` +
      `&typeNames=layer-${layer}` +
      `&outputFormat=application/json` +
      `&srsName=EPSG:4326` +
      `&bbox=${encodeURIComponent(bbox)}` +
      `&count=${encodeURIComponent(count)}`;

    try {
      const upstream = await fetch(wfsUrl, {
        headers: { Accept: 'application/json' },
      });

      if (upstream.ok) {
        const geojsonText = await upstream.text();
        return new Response(geojsonText, {
          status: 200,
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
            ...CORS_HEADERS,
            'Cache-Control': 'public, max-age=3600',
          },
        });
      }
    } catch {
      // Fall through to keyless mirror below if keyed WFS fails transiently
    }
  }

  // 2. Keyless public LINZ ArcGIS mirror fallback via shared live feeds
  try {
    const feedId = layer === '50772' ? 'site' : 'footprint';
    const liveParams = new URLSearchParams({
      feeds: feedId,
      lat: String(parsed.lat),
      lon: String(parsed.lon),
    });
    if (layer === '101290') {
      liveParams.set('bbox', parsed.bbox4);
    }

    const liveRes = await handleLive(liveParams, { env: env || {} });
    const feedObj = liveRes?.body?.feeds?.[feedId];
    const fc =
      layer === '50772'
        ? siteEnvelopeToGeoJSON(feedObj)
        : footprintEnvelopeToGeoJSON(feedObj);

    return jsonResponse(fc, 200, { 'Cache-Control': 'public, max-age=1800' });
  } catch (err) {
    return jsonResponse(
      { error: `Failed to fetch LINZ layer ${layer}: ${err?.message || 'Unknown error'}` },
      502
    );
  }
}
