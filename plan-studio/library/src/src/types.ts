// Types for catalogue.json (assembl.design-inventory.v1). The schema with field notes: public/catalogue.schema.json.

export interface Rights {
  status: 'cleared-by-owner';
  label: string;
  commercialUse: 'not claimed';
}

export interface FileEntry {
  role: 'web' | 'full' | 'master';
  label: string;
  url: string;
  format: 'glb' | 'blend';
  mime?: string;
  bytes: number;
  sha256: string;
  gltf?: string;
  extensionsRequired?: string[];
  triangles?: number;
  meshes?: number;
  materials?: number;
  textures?: number;
  derivedFrom?: string;
}

export interface Item {
  id: string;
  title: string;
  description: string;
  category: string;
  categoryTitle: string;
  type: string;
  scientificName?: string;
  collections: string[];
  sourceIds: Record<string, string>;
  twinRole?: string;
  twin?: { id: string; role: string; fit: 'floor' | 'wall' | 'hang'; turnRadians: number };
  materials: string[];
  materialTags: string[];
  dimensions: {
    stated: string;
    statedSource: string;
    modelBoundsMm: { x: number; y: number; z: number };
    modelBoundsNote: string;
    scale?: string;
    verified: false;
  };
  formats: string[];
  files: FileEntry[];
  preview: { url: string; kind: string; width: number; height: number; note: string };
  sourceStill?: { url: string; kind: string; note: string };
  swatch: string | null;
  licence: { name: string; url: string | null; attribution: string; scope: string; statedBySource?: string };
  rights: Rights;
  verification: {
    readiness: 'preview';
    readinessLabel: string;
    sourceStatus: string;
    dimensionalAccuracy: 'unverified';
    photoreal: 'not claimed';
    notes: string[];
  };
  provenance: string[];
  family?: { id: string; title: string; members: string[] };
  notDeployed: { label: string; bytes: number; where: string }[];
}

export interface Catalogue {
  schema: string;
  title: string;
  built: string;
  snapshot: string;
  live: false;
  note: string;
  base: string;
  rightsDefault: Rights;
  categories: { id: string; title: string; count: number }[];
  collections: { id: string; title: string; count: number; source: string; note: string }[];
  totals: { items: number; glbBytes: number };
  items: Item[];
}
