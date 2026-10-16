export function resolveLoginEmail(identifier:string):string | null {
  const value = identifier.trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? value : null;
}
