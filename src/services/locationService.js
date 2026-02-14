/**
 * Location Service
 * Handles GPS permissions, coordinates, and reverse geocoding to Indian state
 */
import * as Location from 'expo-location';
import { STATE_NAME_TO_ISO } from '../constants/states';

/**
 * Request location permission and get current coordinates
 * @returns {{ latitude: number, longitude: number } | null}
 */
export async function getCurrentLocation() {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      console.warn('[LocationService] Permission denied');
      return null;
    }
    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    return {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
    };
  } catch (error) {
    console.warn('[LocationService] Error getting location:', error.message);
    return null;
  }
}

/**
 * Reverse geocode coordinates to find the Indian state
 * @returns {{ stateName: string, stateIso: string } | null}
 */
export async function reverseGeocodeToState(latitude, longitude) {
  try {
    const results = await Location.reverseGeocodeAsync({ latitude, longitude });
    if (results && results.length > 0) {
      const place = results[0];
      const regionName = place.region || place.subregion || place.city || '';
      const normalized = regionName.toLowerCase().trim();
      const stateIso = STATE_NAME_TO_ISO[normalized] || null;
      return {
        stateName: regionName,
        stateIso,
      };
    }
  } catch (error) {
    console.warn('[LocationService] Reverse geocode error:', error.message);
  }
  return null;
}

/**
 * Convenience: get state from GPS in one call
 */
export async function detectState() {
  const coords = await getCurrentLocation();
  if (!coords) return null;
  return reverseGeocodeToState(coords.latitude, coords.longitude);
}
