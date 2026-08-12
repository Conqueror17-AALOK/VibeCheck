/**
 * Hand-maintained TS mirror of the JSON Schema at repo-root `schema.json`
 * ("VibeCheck Element Schema"). Keep these in sync with schema.json —
 * schema.json remains the single source of truth validated at runtime by
 * `validate.ts`; these types are for compile-time ergonomics only.
 */

export type ElementType =
  | "button"
  | "input"
  | "textarea"
  | "heading"
  | "text"
  | "image"
  | "link"
  | "checkbox"
  | "radio"
  | "select"
  | "label"
  | "card"
  | "container"
  | "icon"
  | "badge"
  | "other";

export type Alignment = "centered" | "left-aligned" | "right-aligned" | "justified";

export type FontWeight =
  | "normal"
  | "bold"
  | "lighter"
  | "100"
  | "200"
  | "300"
  | "400"
  | "500"
  | "600"
  | "700"
  | "800"
  | "900";

export type Visibility = "visible" | "hidden" | "off-screen";

export type DataSource = "extracted" | "generated" | "manual";

export interface ElementPosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface RelativePosition {
  below?: string;
  above?: string;
  left_of?: string;
  right_of?: string;
  alignment?: Alignment;
}

export interface ElementStyle {
  color?: string;
  background_color?: string;
  font_size?: number;
  font_weight?: FontWeight;
  border_radius?: number;
  padding?: string;
  opacity?: number;
}

export interface VibeCheckElement {
  id: string;
  type: ElementType;
  text?: string;
  position: ElementPosition;
  relative_position?: RelativePosition;
  style?: ElementStyle;
  required?: boolean;
  visibility?: Visibility;
}

export interface VibeCheckLayout {
  container_alignment?: "centered" | "left-aligned" | "right-aligned" | "full-width";
  total_elements_expected?: number;
  viewport_width?: number;
  viewport_height?: number;
}

export interface VibeCheckMetadata {
  source?: DataSource;
  timestamp?: string;
  url?: string;
}

export interface VibeCheckData {
  elements: VibeCheckElement[];
  layout?: VibeCheckLayout;
  metadata?: VibeCheckMetadata;
}
