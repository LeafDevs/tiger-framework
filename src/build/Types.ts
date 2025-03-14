// MISC TYPES
export type Callback = () => void;

// HTML ELEMENTS

export type view = "div";
export type text = "h1" | "h2" | "h3" | "h4" | "h5" | "h6" | "p" | "span" | "strong" | "em";
export type link = "a";
export type button = "button" | "input";
export type media = "img" | "video" | "audio" | "iframe" | "canvas" | "source" | "track" | "picture";
export type vector = "svg" | "path" | "circle" | "rect" | "line" | "polyline" | "polygon" | "g" | "defs" | "gradient" | "stop" | "animate" | "animateTransform";
export type form = "form" | "input" | "textarea" | "select" | "option" | "label";
export type list = "ul" | "ol" | "li";
export type table = "table" | "thead" | "tbody" | "tr" | "th" | "td";

// PROPS
export type bind = () => void;
export type classes = string;
export type hoverClasses = string;

// Media Props
export type MediaProps = {
  type?: "image" | "video" | "audio";
  src?: string;
  alt?: string;
  controls?: boolean;
  autoplay?: boolean;
  loop?: boolean;
  muted?: boolean;
  poster?: string;
  preload?: "auto" | "metadata" | "none";
};

// Vector Props
export type VectorProps = {
  src?: string;
  width?: string | number;
  height?: string | number;
  viewBox?: string;
  fill?: string;
  stroke?: string;
  strokeWidth?: string | number;
  d?: string;
  points?: string;
  x?: string | number;
  y?: string | number;
  cx?: string | number;
  cy?: string | number;
  r?: string | number;
  transform?: string;
};

export const as = {
  view: "div",
  text: "p",
  link: "a",
  button: "button",
  media: "img",
  vector: "svg",
  form: "form",
  list: "ul",
  table: "table",
};

