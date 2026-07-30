const COMMANDS = new Map(Object.entries({
  "\\sum": "∑",
  "\\prod": "∏",
  "\\int": "∫",
  "\\min": "min",
  "\\max": "max",
  "\\argmin": "arg min",
  "\\argmax": "arg max",
  "\\leq": "≤",
  "\\le": "≤",
  "\\geq": "≥",
  "\\ge": "≥",
  "\\neq": "≠",
  "\\approx": "≈",
  "\\in": "∈",
  "\\notin": "∉",
  "\\to": "→",
  "\\rightarrow": "→",
  "\\leftarrow": "←",
  "\\cdot": "·",
  "\\times": "×",
  "\\pm": "±",
  "\\infty": "∞",
  "\\partial": "∂",
  "\\nabla": "∇",
  "\\alpha": "α",
  "\\beta": "β",
  "\\gamma": "γ",
  "\\delta": "δ",
  "\\epsilon": "ε",
  "\\theta": "θ",
  "\\lambda": "λ",
  "\\mu": "μ",
  "\\sigma": "σ",
  "\\phi": "φ",
  "\\omega": "ω",
  "\\Delta": "Δ",
  "\\Sigma": "Σ",
  "\\Omega": "Ω"
}));

const SUBSCRIPT = Object.fromEntries(Array.from("0123456789+-=()aehijklmnoprstuvx").map((char, index) => [
  char,
  Array.from("₀₁₂₃₄₅₆₇₈₉₊₋₌₍₎ₐₑₕᵢⱼₖₗₘₙₒₚᵣₛₜᵤᵥₓ")[index]
]));
const SUPERSCRIPT = Object.fromEntries(Array.from("0123456789+-=()in").map((char, index) => [
  char,
  Array.from("⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻⁼⁽⁾ⁱⁿ")[index]
]));

function scriptText(value, table, fallbackPrefix) {
  const chars = Array.from(String(value));
  return chars.every((char) => table[char])
    ? chars.map((char) => table[char]).join("")
    : `${fallbackPrefix}(${value})`;
}

export function latexToUnicode(value) {
  let source = String(value ?? "").trim().replace(/^\$+|\$+$/g, "");
  if (!source) return "";
  for (let pass = 0; pass < 4; pass += 1) {
    source = source.replace(/\\hat\{([^{}]+)\}/g, "$1\u0302");
    source = source.replace(/\\bar\{([^{}]+)\}/g, "$1\u0304");
    source = source.replace(/\\tilde\{([^{}]+)\}/g, "$1\u0303");
    source = source.replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/g, "($1)/($2)");
    source = source.replace(/\\sqrt\{([^{}]+)\}/g, "√($1)");
    source = source.replace(/\\text\{([^{}]+)\}/g, "$1");
  }
  for (const [command, replacement] of COMMANDS) {
    source = source.replaceAll(command, replacement);
  }
  source = source
    .replace(/_\{([^{}]+)\}/g, (_, body) => scriptText(body, SUBSCRIPT, "_"))
    .replace(/\^\{([^{}]+)\}/g, (_, body) => scriptText(body, SUPERSCRIPT, "^"))
    .replace(/_([A-Za-z0-9])/g, (_, body) => scriptText(body, SUBSCRIPT, "_"))
    .replace(/\^([A-Za-z0-9])/g, (_, body) => scriptText(body, SUPERSCRIPT, "^"))
    .replace(/\\left|\\right/g, "")
    .replace(/[{}]/g, "")
    .replace(/\\,/g, " ")
    .replace(/\\;/g, " ")
    .replace(/\\([A-Za-z]+)/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
  return source;
}
