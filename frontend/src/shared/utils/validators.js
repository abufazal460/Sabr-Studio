/**
 * Client-side validation helpers.
 * Phone is always handled as a string end-to-end.
 * Enquiry: name/phone/projectType are required; email + message are optional
 * (email is still format-checked when provided).
 */

export const isValidEmail = (email) => {
  if (!email || typeof email !== 'string') return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
};

/**
 * Real-person name: letters (incl. common accented), internal spaces / . ' -
 * Rejects empty, whitespace-only, digits-only and symbol-only strings.
 */
export const isValidName = (name) => {
  if (!name || typeof name !== 'string') return false;
  const trimmed = name.trim();
  if (trimmed.length < 2 || trimmed.length > 60) return false;
  return /^[A-Za-zÀ-ɏ]+(?:[ .'-][A-Za-zÀ-ɏ]+)*$/.test(trimmed);
};

/**
 * Normalizes then validates a phone number. Supports Indian 10-digit and
 * international (+country) formats; rejects letters, symbols, too-short and
 * repeated-digit values.
 */
export const isValidPhone = (phone) => {
  if (!phone || typeof phone !== 'string') return false;
  const normalized = phone.trim().replace(/[\s\-().]/g, '');
  if (!/^\+?\d+$/.test(normalized)) return false;
  const digits = normalized.replace('+', '');
  if (digits.length < 10 || digits.length > 15) return false;
  if (/^(\d)\1+$/.test(digits)) return false;
  return true;
};

export const validateEnquiryForm = (values) => {
  const errors = {};

  if (!isValidName(values.name)) {
    errors.name = 'Please enter your full name.';
  }

  if (!isValidPhone(values.phone)) {
    errors.phone = 'Please enter a valid phone number.';
  }

  if (!values.projectType || !String(values.projectType).trim()) {
    errors.projectType = 'Please select a project type.';
  }

  // Email is optional: only validated when the user actually provides one.
  const email = (values.email || '').trim();
  if (email && !isValidEmail(email)) {
    errors.email = 'Please enter a valid email address.';
  }

  // Message is optional — no error when empty.
  return errors;
};

export const validateCheckoutForm = (values) => {
  const errors = {};

  if (!values.name || values.name.trim().length < 2) {
    errors.name = 'Full name is required.';
  }

  if (!values.email || !isValidEmail(values.email)) {
    errors.email = 'Valid email is required.';
  }

  if (!values.phone || !isValidPhone(values.phone)) {
    errors.phone = 'Valid phone number is required.';
  }

  if (!values.address || values.address.trim().length < 5) {
    errors.address = 'Delivery address is required.';
  }

  if (!values.city || values.city.trim().length < 2) {
    errors.city = 'City is required.';
  }

  if (!values.pincode || values.pincode.trim().length < 4) {
    errors.pincode = 'Valid PIN/Postal code is required.';
  }

  return errors;
};
