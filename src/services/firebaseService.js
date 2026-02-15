/**
 * Firebase Service — Initializes Firebase and exports shared instances
 */
import firebase from '@react-native-firebase/app';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import analytics from '@react-native-firebase/analytics';

// Firebase is auto-initialized by the native config plugin (google-services.json),
// so we just export the module references here.

export { auth, firestore, analytics };
export default firebase;
