export const PASSWORD_REQUIREMENTS_TEXT =
  "Minst 6 tegn, med stor bokstav, liten bokstav, tall og spesialtegn";

export function validatePassword(password) {
  if (password.length < 6) {
    return "Passordet må ha minst 6 tegn";
  }
  if (!/[A-Z]/.test(password)) {
    return "Passordet må inneholde minst én stor bokstav";
  }
  if (!/[a-z]/.test(password)) {
    return "Passordet må inneholde minst én liten bokstav";
  }
  if (!/[0-9]/.test(password)) {
    return "Passordet må inneholde minst ett tall";
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    return "Passordet må inneholde minst ett spesialtegn";
  }
  return null;
}
