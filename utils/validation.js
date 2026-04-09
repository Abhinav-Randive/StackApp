export function normalizeEmail(value = "") {
  return value.trim().toLowerCase();
}

export function isValidEmail(value = "") {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(value));
}

export function parsePositiveAmount(value = "") {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export function isValidDateInput(value = "") {
  if (!value) return true;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

  const parsed = new Date(value);
  return !Number.isNaN(parsed.getTime());
}

export function sanitizeText(value = "", maxLength = 120) {
  return value.trim().slice(0, maxLength);
}
