

export const seatKey = (code: string) => `popular-opinion:${code}`;

export function readSeatToken(code: string) {
  const key = seatKey(code);
  const legacyKey = `public-opinion:${code}`;
  const token = localStorage.getItem(key) ?? localStorage.getItem(legacyKey);
  if (token && localStorage.getItem(legacyKey)) {
    localStorage.setItem(key, token);
    localStorage.removeItem(legacyKey);
  }
  return token;
}


