/**
 * Client-side validation helpers.
 * Phone is always handled as a string end-to-end.
 * Email is strictly required (per Master Context C4 / PRD).
 */

export const isValidEmail = (email) => {
  if (!email || typeof email !== 'string') return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
};

export const isValidPhone = (phone) => {
  if (!phone || typeof phone !== 'string') return false;
  // Valid phone pattern: allows optional leading +, spaces, hyphens, min 7 digits
  const digitsOnly = phone.replace(/\D/g, '');
  return digitsOnly.length >= 7 && digitsOnly.length <= 15;
};

export const validateEnquiryForm = (values) => {
  const errors = {};

  if (!values.name || values.name.trim().length < 2) {
    errors.name = 'Full name must be at least 2 characters.';
  }

  if (!values.email || !isValidEmail(values.email)) {
    errors.email = 'Please enter a valid email address.';
  }

  if (!values.phone || !isValidPhone(values.phone)) {
    errors.phone = 'Please enter a valid contact phone number.';
  }

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
