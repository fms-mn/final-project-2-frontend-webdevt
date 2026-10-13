export function profileInitials(name) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return [parts[0], parts.length > 1 ? parts.at(-1) : null]
    .filter(Boolean).map(part => Array.from(part)[0]).join('').toUpperCase() || 'F';
}

export function profileErrors(name, phone) {
  const errors = {};
  if (!name.trim()) errors.name = 'Name is required.';
  const number = phone.trim();
  if (number && (!/^\+?[\d\s().-]+$/.test(number) || !/^\d{7,15}$/.test(number.replace(/\D/g, '')))) {
    errors.phone = 'Enter a phone number with 7–15 digits, or leave it blank.';
  }
  return errors;
}
