/**
 * Train Booking Reminder — Indian Holiday Long Weekend Planner
 *
 * Main entry point with bottom tab navigation:
 *   - Home:      Upcoming long weekends
 *   - Calendar:  Holiday calendar view
 *   - Reminders: Active alarms & booking reminders
 *   - Settings:  State selector & app info
 */
import React, { useEffect, useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Platform, Text, ActivityIndicator, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider, useAuth } from './src/context/AuthContext';
import { AppProvider } from './src/context/AppContext';
import AuthScreen from './src/screens/AuthScreen';
import HomeScreen from './src/screens/HomeScreen';
import CalendarScreen from './src/screens/CalendarScreen';
import RemindersScreen from './src/screens/RemindersScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import {
  addNotificationReceivedListener,
  addNotificationResponseListener,
} from './src/services/NotificationManager';
import { logAppOpen } from './src/services/analyticsService';
import { COLORS } from './src/constants/theme';

const Tab = createBottomTabNavigator();

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <AppGate />
      </AuthProvider>
    </SafeAreaProvider>
  );
}

/**
 * AppGate — Shows AuthScreen if not logged in, main app if logged in
 */
function AppGate() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={{ marginTop: 12, color: COLORS.textSecondary, fontSize: 14 }}>Loading...</Text>
      </View>
    );
  }

  if (!user) {
    return <AuthScreen />;
  }

  return <MainApp />;
}

/**
 * MainApp — The main tabbed app (only shown after authentication)
 */
function MainApp() {
  const notificationListener = useRef();
  const responseListener = useRef();

  useEffect(() => {
    // Log app open to analytics
    logAppOpen();

    // Listen for notifications received in foreground
    notificationListener.current = addNotificationReceivedListener((notification) => {
      console.log('[App] Notification received:', notification.request.content.title);
    });

    // Listen for notification taps
    responseListener.current = addNotificationResponseListener((response) => {
      const data = response.notification.request.content.data;
      console.log('[App] Notification tapped:', data);
    });

    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, []);

  return (
    <AppProvider>
      <NavigationContainer>
        <StatusBar style="light" />
          <Tab.Navigator
            screenOptions={{
              headerShown: false,
              tabBarActiveTintColor: COLORS.primary,
              tabBarInactiveTintColor: COLORS.textSecondary,
              tabBarStyle: {
                backgroundColor: COLORS.surface,
                borderTopColor: COLORS.border,
                paddingBottom: Platform.OS === 'ios' ? 20 : 8,
                paddingTop: 8,
                height: Platform.OS === 'ios' ? 88 : 65,
              },
              tabBarLabelStyle: {
                fontSize: 11,
                fontWeight: '600',
              },
            }}
          >
            <Tab.Screen
              name="Home"
              component={HomeScreen}
              options={{
                tabBarLabel: 'Weekends',
                tabBarIcon: ({ color }) => (
                  <TabIcon icon="🚂" color={color} />
                ),
              }}
            />
            <Tab.Screen
              name="Calendar"
              component={CalendarScreen}
              options={{
                tabBarLabel: 'Calendar',
                tabBarIcon: ({ color }) => (
                  <TabIcon icon="📅" color={color} />
                ),
              }}
            />
            <Tab.Screen
              name="Reminders"
              component={RemindersScreen}
              options={{
                tabBarLabel: 'Reminders',
                tabBarIcon: ({ color }) => (
                  <TabIcon icon="⏰" color={color} />
                ),
              }}
            />
            <Tab.Screen
              name="Settings"
              component={SettingsScreen}
              options={{
                tabBarLabel: 'Settings',
                tabBarIcon: ({ color }) => (
                  <TabIcon icon="⚙️" color={color} />
                ),
              }}
            />
          </Tab.Navigator>
        </NavigationContainer>
    </AppProvider>
  );
}

// Simple emoji-based tab icon (avoids adding an icon library dependency)
function TabIcon({ icon }) {
  return <Text style={{ fontSize: 22 }}>{icon}</Text>;
}
