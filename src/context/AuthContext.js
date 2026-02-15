/**
 * Auth Context — Firebase Authentication state management
 *
 * Provides:
 *  - user: current Firebase user object (or null)
 *  - loading: auth state loading
 *  - signInWithEmail / signUpWithEmail
 *  - signInWithGoogle
 *  - signOut
 */
import React, { createContext, useContext, useState, useEffect } from 'react';
import auth from '@react-native-firebase/auth';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { saveUserProfile } from '../services/firestoreService';
import { logLogin, logSignUp, setAnalyticsUserId } from '../services/analyticsService';

const AuthContext = createContext();

// Configure Google Sign-In (web client ID from Firebase Console)
// This will be populated once you add the SHA-1 in Firebase
GoogleSignin.configure({
  webClientId: '906649903963-d83sc53uep5of6sdgpisfcsbpjjstnkf.apps.googleusercontent.com', // Will be set once OAuth client is added in Firebase
});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  // Listen for auth state changes
  useEffect(() => {
    const unsubscribe = auth().onAuthStateChanged(async (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);

      if (firebaseUser) {
        // Set analytics user ID
        await setAnalyticsUserId(firebaseUser.uid);
        // Save/update profile in Firestore
        await saveUserProfile({
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
          photoURL: firebaseUser.photoURL,
        });
      }
    });

    return unsubscribe;
  }, []);

  // ─── Email/Password Sign Up ───────────────────────────────────────

  const signUpWithEmail = async (email, password, displayName) => {
    try {
      setAuthError(null);
      const credential = await auth().createUserWithEmailAndPassword(email, password);

      // Update display name
      if (displayName) {
        await credential.user.updateProfile({ displayName });
      }

      await logSignUp('email');
      return { success: true };
    } catch (err) {
      const message = _getAuthErrorMessage(err.code);
      setAuthError(message);
      return { success: false, error: message };
    }
  };

  // ─── Email/Password Sign In ───────────────────────────────────────

  const signInWithEmail = async (email, password) => {
    try {
      setAuthError(null);
      await auth().signInWithEmailAndPassword(email, password);
      await logLogin('email');
      return { success: true };
    } catch (err) {
      const message = _getAuthErrorMessage(err.code);
      setAuthError(message);
      return { success: false, error: message };
    }
  };

  // ─── Google Sign-In ───────────────────────────────────────────────

  const signInWithGoogle = async () => {
    try {
      setAuthError(null);

      // Check if Google Play Services are available
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

      // Get user's Google credentials
      const response = await GoogleSignin.signIn();
      const idToken = response?.data?.idToken;

      if (!idToken) {
        throw new Error('Failed to get Google ID token');
      }

      // Create Firebase credential
      const googleCredential = auth.GoogleAuthProvider.credential(idToken);

      // Sign in to Firebase
      await auth().signInWithCredential(googleCredential);
      await logLogin('google');
      return { success: true };
    } catch (err) {
      console.error('[Auth] Google Sign-In error:', err);
      const message = err.code === 'SIGN_IN_CANCELLED'
        ? 'Sign-in was cancelled'
        : err.message || 'Google sign-in failed. Please try again.';
      setAuthError(message);
      return { success: false, error: message };
    }
  };

  // ─── Sign Out ─────────────────────────────────────────────────────

  const signOutUser = async () => {
    try {
      // Sign out from Google if applicable
      try {
        await GoogleSignin.signOut();
      } catch (_) {
        // User might not have signed in with Google
      }
      await auth().signOut();
      return { success: true };
    } catch (err) {
      console.error('[Auth] Sign out error:', err);
      return { success: false, error: err.message };
    }
  };

  // ─── Password Reset ──────────────────────────────────────────────

  const resetPassword = async (email) => {
    try {
      setAuthError(null);
      await auth().sendPasswordResetEmail(email);
      return { success: true };
    } catch (err) {
      const message = _getAuthErrorMessage(err.code);
      setAuthError(message);
      return { success: false, error: message };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        authError,
        signUpWithEmail,
        signInWithEmail,
        signInWithGoogle,
        signOut: signOutUser,
        resetPassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

// ─── Error Message Mapping ──────────────────────────────────────────

function _getAuthErrorMessage(code) {
  switch (code) {
    case 'auth/email-already-in-use':
      return 'This email is already registered. Try signing in instead.';
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/weak-password':
      return 'Password should be at least 6 characters.';
    case 'auth/user-not-found':
      return 'No account found with this email. Sign up first.';
    case 'auth/wrong-password':
      return 'Incorrect password. Try again or reset your password.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Please try again later.';
    case 'auth/network-request-failed':
      return 'Network error. Check your internet connection.';
    case 'auth/invalid-credential':
      return 'Invalid credentials. Please check your email and password.';
    default:
      return 'Something went wrong. Please try again.';
  }
}
