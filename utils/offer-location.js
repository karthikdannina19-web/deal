export function parseCoordinate(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function hasValidCoordinates(latitude, longitude) {
  return Number.isFinite(latitude)
    && Number.isFinite(longitude)
    && latitude >= -90
    && latitude <= 90
    && longitude >= -180
    && longitude <= 180
    && !(latitude === 0 && longitude === 0);
}

export function getVendorCoordinates(vendor) {
  const latitude = parseCoordinate(
    vendor?.locationCoordinates?.coordinates?.[1]
      ?? vendor?.location?.coordinates?.[1]
      ?? vendor?.locationCoordinates?.lat
      ?? vendor?.location?.lat
      ?? null
  );
  const longitude = parseCoordinate(
    vendor?.locationCoordinates?.coordinates?.[0]
      ?? vendor?.location?.coordinates?.[0]
      ?? vendor?.locationCoordinates?.lng
      ?? vendor?.location?.lng
      ?? null
  );

  if (!hasValidCoordinates(latitude, longitude)) {
    return {
      latitude: null,
      longitude: null,
    };
  }

  return { latitude, longitude };
}

export function calculateDistanceKm(userLatitude, userLongitude, storeLatitude, storeLongitude) {
  if (!hasValidCoordinates(userLatitude, userLongitude) || !hasValidCoordinates(storeLatitude, storeLongitude)) {
    return null;
  }

  const earthRadiusKm = 6371;
  const dLat = degreesToRadians(storeLatitude - userLatitude);
  const dLng = degreesToRadians(storeLongitude - userLongitude);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(degreesToRadians(userLatitude)) *
      Math.cos(degreesToRadians(storeLatitude)) *
      Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Number((earthRadiusKm * c).toFixed(1));
}

export function normalizeDistanceKm(value) {
  return Number.isFinite(value) ? Number(value.toFixed(1)) : null;
}

function degreesToRadians(value) {
  return (value * Math.PI) / 180;
}
