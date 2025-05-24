import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

// Import screens
import OrderBookScreen from './src/screens/OrderBookScreen';
import HeatmapScreen from './src/screens/HeatmapScreen';
import TradesScreen from './src/screens/TradesScreen';
import SettingsScreen from './src/screens/SettingsScreen';

// Import providers
import { WebSocketProvider } from './src/contexts/WebSocketContext';
import { ThemeProvider } from './src/contexts/ThemeContext';

const Tab = createBottomTabNavigator();

export default function App() {
  return (
    <ThemeProvider>
      <WebSocketProvider>
        <SafeAreaProvider>
          <NavigationContainer>
            <StatusBar style="light" />
            <Tab.Navigator
              screenOptions={{
                tabBarStyle: {
                  backgroundColor: '#0d1117',
                  borderTopColor: '#30363d',
                },
                tabBarActiveTintColor: '#58a6ff',
                tabBarInactiveTintColor: '#8b949e',
                headerStyle: {
                  backgroundColor: '#0d1117',
                  borderBottomColor: '#30363d',
                },
                headerTintColor: '#ffffff',
              }}
            >
              <Tab.Screen
                name="OrderBook"
                component={OrderBookScreen}
                options={{
                  tabBarLabel: 'Order Book',
                  tabBarIcon: ({ color, size }) => (
                    <Ionicons name="book" size={size} color={color} />
                  ),
                }}
              />
              <Tab.Screen
                name="Heatmap"
                component={HeatmapScreen}
                options={{
                  tabBarLabel: 'Heatmap',
                  tabBarIcon: ({ color, size }) => (
                    <Ionicons name="flame" size={size} color={color} />
                  ),
                }}
              />
              <Tab.Screen
                name="Trades"
                component={TradesScreen}
                options={{
                  tabBarLabel: 'Trades',
                  tabBarIcon: ({ color, size }) => (
                    <Ionicons name="pulse" size={size} color={color} />
                  ),
                }}
              />
              <Tab.Screen
                name="Settings"
                component={SettingsScreen}
                options={{
                  tabBarLabel: 'Settings',
                  tabBarIcon: ({ color, size }) => (
                    <Ionicons name="settings" size={size} color={color} />
                  ),
                }}
              />
            </Tab.Navigator>
          </NavigationContainer>
        </SafeAreaProvider>
      </WebSocketProvider>
    </ThemeProvider>
  );
}