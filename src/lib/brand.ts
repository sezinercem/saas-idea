import type { CSSProperties } from "react";

export function isHexColour(value: string) {
  return /^#[0-9a-fA-F]{6}$/.test(value);
}

export function brandStyleVars(primaryColour?: string | null): CSSProperties {
  const colour = primaryColour && isHexColour(primaryColour) ? primaryColour : "#1d4ed8";

  return {
    "--color-brand-50": tint(colour, 0.92),
    "--color-brand-100": tint(colour, 0.82),
    "--color-brand-500": tint(colour, 0.08),
    "--color-brand-600": colour,
    "--color-brand-700": shade(colour, 0.18),
  } as CSSProperties;
}

function tint(hex: string, amount: number) {
  return mix(hex, "#ffffff", amount);
}

function shade(hex: string, amount: number) {
  return mix(hex, "#000000", amount);
}

function mix(hex: string, targetHex: string, amount: number) {
  const source = parseHex(hex);
  const target = parseHex(targetHex);
  const mixed = source.map((channel, index) => Math.round(channel + (target[index] - channel) * amount));
  return `#${mixed.map((channel) => channel.toString(16).padStart(2, "0")).join("")}`;
}

function parseHex(hex: string) {
  return [1, 3, 5].map((start) => Number.parseInt(hex.slice(start, start + 2), 16));
}
