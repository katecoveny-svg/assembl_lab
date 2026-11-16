import type * as THREE from 'three';
import type { Quality } from './util';

export interface ObjectInfo {
  key: string;
  name: string;
  category: string;
  summary: string;
  /** overall size and key measurements, as built */
  dimensions: string;
  /** where figures and construction come from */
  sources: string[];
  /** what was assumed or simplified, and anything unverified */
  assumptions: string[];
}

export interface LibraryObject {
  info: ObjectInfo;
  build: (q: Quality) => THREE.Object3D;
}
