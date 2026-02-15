/**
 * Firestore Service — Cloud storage for user data
 *
 * Stores per-user:
 *  - Holiday list (based on location/state)
 *  - User preferences
 */
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';

const usersCollection = firestore().collection('users');

/**
 * Get current user's Firestore document reference
 */
function getUserDocRef() {
  const user = auth().currentUser;
  if (!user) throw new Error('User not authenticated');
  return usersCollection.doc(user.uid);
}

// ─── User Profile ───────────────────────────────────────────────────

/**
 * Create or update user profile on login
 * @param {object} userData - { email, displayName, photoURL, ... }
 */
export async function saveUserProfile(userData) {
  try {
    const docRef = getUserDocRef();
    await docRef.set(
      {
        email: userData.email || '',
        displayName: userData.displayName || '',
        photoURL: userData.photoURL || '',
        lastLogin: firestore.FieldValue.serverTimestamp(),
        updatedAt: firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
  } catch (err) {
    console.error('[Firestore] saveUserProfile error:', err);
  }
}

/**
 * Get user profile from Firestore
 */
export async function getUserProfile() {
  try {
    const doc = await getUserDocRef().get();
    return doc.exists ? doc.data() : null;
  } catch (err) {
    console.error('[Firestore] getUserProfile error:', err);
    return null;
  }
}

// ─── User Holidays (synced to cloud) ────────────────────────────────

/**
 * Save user's holiday list to Firestore
 * @param {string} stateIso - User's selected state
 * @param {Array} holidays - Array of holiday objects
 */
export async function saveUserHolidays(stateIso, holidays) {
  try {
    const docRef = getUserDocRef();
    await docRef.collection('data').doc('holidays').set({
      stateIso,
      holidays,
      updatedAt: firestore.FieldValue.serverTimestamp(),
    });
  } catch (err) {
    console.error('[Firestore] saveUserHolidays error:', err);
  }
}

/**
 * Get user's holiday list from Firestore
 * @returns {{ stateIso: string, holidays: Array } | null}
 */
export async function getUserHolidays() {
  try {
    const doc = await getUserDocRef().collection('data').doc('holidays').get();
    return doc.exists ? doc.data() : null;
  } catch (err) {
    console.error('[Firestore] getUserHolidays error:', err);
    return null;
  }
}

// ─── User State Preference ──────────────────────────────────────────

/**
 * Save user's selected state to Firestore
 * @param {string} stateIso
 * @param {string} stateName
 */
export async function saveUserState(stateIso, stateName) {
  try {
    const docRef = getUserDocRef();
    await docRef.set(
      {
        selectedState: stateIso,
        stateName: stateName || '',
        updatedAt: firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
  } catch (err) {
    console.error('[Firestore] saveUserState error:', err);
  }
}

/**
 * Get user's selected state from Firestore
 * @returns {{ selectedState: string, stateName: string } | null}
 */
export async function getUserState() {
  try {
    const doc = await getUserDocRef().get();
    if (doc.exists) {
      const data = doc.data();
      return data.selectedState ? { selectedState: data.selectedState, stateName: data.stateName } : null;
    }
    return null;
  } catch (err) {
    console.error('[Firestore] getUserState error:', err);
    return null;
  }
}

// ─── User Custom Holidays ───────────────────────────────────────────

/**
 * Save user's custom holidays to Firestore
 * @param {Array} customHolidays
 */
export async function saveUserCustomHolidays(customHolidays) {
  try {
    const docRef = getUserDocRef();
    await docRef.collection('data').doc('customHolidays').set({
      holidays: customHolidays,
      updatedAt: firestore.FieldValue.serverTimestamp(),
    });
  } catch (err) {
    console.error('[Firestore] saveUserCustomHolidays error:', err);
  }
}

/**
 * Get user's custom holidays from Firestore
 * @returns {Array}
 */
export async function getUserCustomHolidays() {
  try {
    const doc = await getUserDocRef().collection('data').doc('customHolidays').get();
    return doc.exists ? doc.data().holidays || [] : [];
  } catch (err) {
    console.error('[Firestore] getUserCustomHolidays error:', err);
    return [];
  }
}
