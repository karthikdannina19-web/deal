const MAX_LOCATION_NAME_LENGTH = 120;

function isObjectLikeString(value) {
  const trimmed = value.trim();

  if (
    (trimmed.startsWith('{') && trimmed.endsWith('}'))
    || (trimmed.startsWith('[') && trimmed.endsWith(']'))
  ) {
    return true;
  }

  return /^\s*[\[{].*\b(?:id|name)\s*:/i.test(trimmed);
}

function validateLocationName(value) {
  if (typeof value !== 'string') {
    return { valid: false, message: 'must be plain text' };
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return { valid: false, message: 'is required' };
  }
  if (trimmed.length > MAX_LOCATION_NAME_LENGTH) {
    return { valid: false, message: `must be ${MAX_LOCATION_NAME_LENGTH} characters or fewer` };
  }
  if (isObjectLikeString(trimmed)) {
    return { valid: false, message: 'must be plain text, not an object or object-like string' };
  }

  return { valid: true, value: trimmed };
}

function assertLocationName(value, fieldName = 'Location name') {
  const result = validateLocationName(value);
  if (!result.valid) {
    throw new TypeError(`${fieldName} ${result.message}`);
  }
  return result.value;
}

export { MAX_LOCATION_NAME_LENGTH, assertLocationName, validateLocationName };
