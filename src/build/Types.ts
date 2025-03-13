// MISC TYPES
export type Callback = () => void;

// HTML ELEMENTS

export type view = "div";
export type text = "h1" | "h2" | "h3" | "h4" | "h5" | "h6" | "p" | "span" | "strong" | "em";
export type link = "a";
export type button = "button" | "input";
export type media = "img" | "video" | "audio" | "iframe" | "canvas";
export type form = "form" | "input" | "textarea" | "select" | "option" | "label";
export type list = "ul" | "ol" | "li";
export type table = "table" | "thead" | "tbody" | "tr" | "th" | "td";

// PROPS
export type bind = () => void;
export type classes = string;
export type hoverClasses = string;

export const as = {
  view: "div",
  text: "p",
  link: "a",
  button: "button",
  media: "img",
  form: "form",
  list: "ul",
  table: "table",
};

