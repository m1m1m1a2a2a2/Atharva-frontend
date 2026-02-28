
export enum Tool {
  SELECT = 'SELECT',
  LINE = 'LINE',
  BOX = 'BOX'
}

export interface Point {
  x: number;
  y: number;
}

export interface AnnotationLine {
  id: string;
  points: [Point, Point];
  color: string;
  label?: string;
}

export interface AnnotationBox {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  label?: string;
}

export interface ProjectImage {
  id: string;
  name: string;
  url: string;
  lines: AnnotationLine[];
  boxes: AnnotationBox[];
  createdAt: number;
  scale: number; // pixels per unit (e.g. mm)
  unit: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
}

export interface AppState {
  user: User | null;
  projects: ProjectImage[];
  currentProjectId: string | null;
}
