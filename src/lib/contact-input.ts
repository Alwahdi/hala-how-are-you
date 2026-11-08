import { parsePhoneNumberFromString } from 'libphonenumber-js/max';
export function splitInternationalInput(value: string, dial: string) {
  const trimmed = value.trim();
  if (trimmed.startsWith('+')) {
    const parsed = parsePhoneNumberFromString(trimmed);
    if (parsed) return { dial: `+${parsed.countryCallingCode}`, phone: parsed.nationalNumber as string };
  }
  return { dial, phone: value };
}
export function contactValue(phone: string, dial: string) {
  return phone.trim().startsWith('+') ? phone.trim() : dial.trim() + phone.replace(/[\s()-]/g, '');
}