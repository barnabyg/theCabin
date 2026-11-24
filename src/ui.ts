export function element(id: string) {
  const el = document.getElementById(id);
  if (!el) throw Error(`Missing element ${id}`);
  return el;
}
export function paragraph(parent: HTMLElement, content: string) {
  const p = document.createElement("p");
  p.textContent = content;
  parent.append(p);
}
export function heading(parent: HTMLElement, content: string) {
  const h = document.createElement("h2");
  h.textContent = content;
  parent.append(h);
}
export function button(parent: HTMLElement, label: string, click: () => void, disabled = false) {
  const b = document.createElement("button");
  b.type = "button";
  b.textContent = label;
  b.disabled = disabled;
  b.onclick = click;
  parent.append(b);
  return b;
}
