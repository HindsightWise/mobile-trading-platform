import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  TextInput,
  Alert,
  SegmentedControlIOS,
  Platform,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useWebSocket } from '../contexts/WebSocketContext';
import { useTheme } from '../contexts/ThemeContext';

const CRYPTO_SYMBOLS = [
  'BTCUSDT',
  'ETHUSDT',
  'BNBUSDT',
  'SOLUSDT',
  'XRPUSDT',
  'ADAUSDT',
  'DOGEUSDT',
  'MATICUSDT',
];

const STOCK_SYMBOLS = [
  'AAPL',
  'GOOGL',
  'MSFT',
  'AMZN',
  'TSLA',
  'META',
  'NVDA',
  'JPM',
  'V',
  'JNJ',
  'WMT',
  'PG',
];

const PROVIDERS = {
  crypto: [
    { label: 'Demo Mode', value: 'demo' },
    { label: 'Binance', value: 'binance' },
    { label: 'Coinbase (Coming Soon)', value: 'coinbase', disabled: true },
  ],
  stock: [
    { label: 'Demo Mode', value: 'demo' },
    { label: 'Alpaca (Coming Soon)', value: 'alpaca', disabled: true },
    { label: 'Polygon.io (Coming Soon)', value: 'polygon', disabled: true },
  ],
};

export default function SettingsScreen() {
  const {
    symbol,
    setSymbol,
    assetType,
    setAssetType,
    provider,
    setProvider,
    reconnect,
    isMarketOpen,
  } = useWebSocket();
  const { theme, isDark, toggleTheme } = useTheme();
  const [customSymbol, setCustomSymbol] = useState('');
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [priceAlerts, setPriceAlerts] = useState(true);
  const [volumeAlerts, setVolumeAlerts] = useState(false);
  const [updateInterval, setUpdateInterval] = useState('100');

  const currentSymbols = assetType === 'crypto' ? CRYPTO_SYMBOLS : STOCK_SYMBOLS;
  const currentProviders = PROVIDERS[assetType];

  const handleSymbolChange = (newSymbol: string) => {
    setSymbol(newSymbol);
    reconnect();
    Alert.alert('Success', `Symbol changed to ${newSymbol}`);
  };

  const handleAssetTypeChange = (newType: 'crypto' | 'stock') => {
    setAssetType(newType);
    setProvider('demo'); // Reset to demo when switching asset types
    Alert.alert('Asset Type Changed', `Switched to ${newType === 'crypto' ? 'Cryptocurrency' : 'Stocks'}`);
  };

  const handleProviderChange = (newProvider: string) => {
    setProvider(newProvider as any);
    reconnect();
    Alert.alert('Success', `Data provider changed to ${newProvider}`);
  };

  const handleCustomSymbolSubmit = () => {
    if (customSymbol.trim()) {
      const formattedSymbol = assetType === 'crypto' 
        ? customSymbol.toUpperCase() 
        : customSymbol.toUpperCase().replace(/USDT$/, '');
      handleSymbolChange(formattedSymbol);
      setCustomSymbol('');
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Asset Type Selection */}
      <View style={[styles.section, { backgroundColor: theme.surface }]}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Asset Type</Text>
        
        {Platform.OS === 'ios' ? (
          <SegmentedControlIOS
            values={['Crypto', 'Stocks']}
            selectedIndex={assetType === 'crypto' ? 0 : 1}
            onChange={(event) => {
              const newType = event.nativeEvent.selectedSegmentIndex === 0 ? 'crypto' : 'stock';
              handleAssetTypeChange(newType);
            }}
            style={styles.segmentedControl}
          />
        ) : (
          <View style={styles.assetTypeButtons}>
            <TouchableOpacity
              style={[
                styles.assetTypeButton,
                { 
                  backgroundColor: assetType === 'crypto' ? theme.accent : theme.border,
                },
              ]}
              onPress={() => handleAssetTypeChange('crypto')}
            >
              <Text style={[styles.assetTypeButtonText, { color: assetType === 'crypto' ? '#ffffff' : theme.text }]}>
                Crypto
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.assetTypeButton,
                { 
                  backgroundColor: assetType === 'stock' ? theme.accent : theme.border,
                },
              ]}
              onPress={() => handleAssetTypeChange('stock')}
            >
              <Text style={[styles.assetTypeButtonText, { color: assetType === 'stock' ? '#ffffff' : theme.text }]}>
                Stocks
              </Text>
            </TouchableOpacity>
          </View>
        )}
        
        {assetType === 'stock' && (
          <View style={[styles.marketStatus, { backgroundColor: isMarketOpen ? theme.success + '20' : theme.sell + '20' }]}>
            <View style={[styles.statusDot, { backgroundColor: isMarketOpen ? theme.success : theme.sell }]} />
            <Text style={[styles.marketStatusText, { color: theme.text }]}>
              Market is {isMarketOpen ? 'Open' : 'Closed'}
            </Text>
          </View>
        )}
      </View>

      {/* Data Provider Settings */}
      <View style={[styles.section, { backgroundColor: theme.surface }]}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Data Provider</Text>
        <View style={[styles.pickerContainer, { backgroundColor: theme.background }]}>
          <Picker
            selectedValue={provider}
            onValueChange={handleProviderChange}
            style={{ color: theme.text }}
            dropdownIconColor={theme.text}
          >
            {currentProviders.map(p => (
              <Picker.Item 
                key={p.value} 
                label={p.label} 
                value={p.value}
                enabled={!p.disabled}
              />
            ))}
          </Picker>
        </View>
      </View>

      {/* Symbol Settings */}
      <View style={[styles.section, { backgroundColor: theme.surface }]}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>
          {assetType === 'crypto' ? 'Trading Pair' : 'Stock Symbol'}
        </Text>
        <Text style={[styles.currentSymbol, { color: theme.accent }]}>
          Current: {symbol}
        </Text>
        
        <Text style={[styles.subsectionTitle, { color: theme.textSecondary }]}>
          Popular {assetType === 'crypto' ? 'Pairs' : 'Stocks'}
        </Text>
        <View style={styles.symbolGrid}>
          {currentSymbols.map(sym => (
            <TouchableOpacity
              key={sym}
              style={[
                styles.symbolButton,
                { 
                  backgroundColor: sym === symbol ? theme.accent : theme.border,
                },
              ]}
              onPress={() => handleSymbolChange(sym)}
            >
              <Text
                style={[
                  styles.symbolButtonText,
                  { color: sym === symbol ? '#ffffff' : theme.text },
                ]}
              >
                {sym}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={[styles.subsectionTitle, { color: theme.textSecondary }]}>
          Custom Symbol
        </Text>
        <View style={styles.customSymbolContainer}>
          <TextInput
            style={[
              styles.customSymbolInput,
              { 
                backgroundColor: theme.background,
                color: theme.text,
                borderColor: theme.border,
              },
            ]}
            placeholder={assetType === 'crypto' ? "e.g., LTCUSDT" : "e.g., AAPL"}
            placeholderTextColor={theme.textSecondary}
            value={customSymbol}
            onChangeText={setCustomSymbol}
            onSubmitEditing={handleCustomSymbolSubmit}
            autoCapitalize="characters"
          />
          <TouchableOpacity
            style={[styles.submitButton, { backgroundColor: theme.accent }]}
            onPress={handleCustomSymbolSubmit}
          >
            <Text style={styles.submitButtonText}>Set</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Appearance Settings */}
      <View style={[styles.section, { backgroundColor: theme.surface }]}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Appearance</Text>
        <View style={styles.settingRow}>
          <Text style={[styles.settingLabel, { color: theme.text }]}>Dark Mode</Text>
          <Switch
            value={isDark}
            onValueChange={toggleTheme}
            trackColor={{ false: theme.border, true: theme.accent }}
            thumbColor="#ffffff"
          />
        </View>
      </View>

      {/* Notification Settings */}
      <View style={[styles.section, { backgroundColor: theme.surface }]}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Notifications</Text>
        <View style={styles.settingRow}>
          <Text style={[styles.settingLabel, { color: theme.text }]}>
            Enable Notifications
          </Text>
          <Switch
            value={notificationsEnabled}
            onValueChange={setNotificationsEnabled}
            trackColor={{ false: theme.border, true: theme.accent }}
            thumbColor="#ffffff"
          />
        </View>
        <View style={styles.settingRow}>
          <Text style={[styles.settingLabel, { color: theme.text }]}>
            Price Alerts
          </Text>
          <Switch
            value={priceAlerts}
            onValueChange={setPriceAlerts}
            trackColor={{ false: theme.border, true: theme.accent }}
            thumbColor="#ffffff"
            disabled={!notificationsEnabled}
          />
        </View>
        <View style={styles.settingRow}>
          <Text style={[styles.settingLabel, { color: theme.text }]}>
            Volume Alerts
          </Text>
          <Switch
            value={volumeAlerts}
            onValueChange={setVolumeAlerts}
            trackColor={{ false: theme.border, true: theme.accent }}
            thumbColor="#ffffff"
            disabled={!notificationsEnabled}
          />
        </View>
      </View>

      {/* Performance Settings */}
      <View style={[styles.section, { backgroundColor: theme.surface }]}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Performance</Text>
        <Text style={[styles.settingLabel, { color: theme.text }]}>
          Update Interval (ms)
        </Text>
        <View style={[styles.pickerContainer, { backgroundColor: theme.background }]}>
          <Picker
            selectedValue={updateInterval}
            onValueChange={setUpdateInterval}
            style={{ color: theme.text }}
            dropdownIconColor={theme.text}
          >
            <Picker.Item label="100ms (Fastest)" value="100" />
            <Picker.Item label="250ms (Fast)" value="250" />
            <Picker.Item label="500ms (Normal)" value="500" />
            <Picker.Item label="1000ms (Battery Saver)" value="1000" />
          </Picker>
        </View>
      </View>

      {/* About Section */}
      <View style={[styles.section, { backgroundColor: theme.surface }]}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>About</Text>
        <View style={styles.aboutItem}>
          <Text style={[styles.aboutLabel, { color: theme.textSecondary }]}>
            Version
          </Text>
          <Text style={[styles.aboutValue, { color: theme.text }]}>2.0.0</Text>
        </View>
        <View style={styles.aboutItem}>
          <Text style={[styles.aboutLabel, { color: theme.textSecondary }]}>
            Build
          </Text>
          <Text style={[styles.aboutValue, { color: theme.text }]}>
            Multi-Asset Trading Platform
          </Text>
        </View>
        <View style={styles.aboutItem}>
          <Text style={[styles.aboutLabel, { color: theme.textSecondary }]}>
            Supported Markets
          </Text>
          <Text style={[styles.aboutValue, { color: theme.text }]}>
            Crypto & US Stocks
          </Text>
        </View>
      </View>

      <View style={{ height: 50 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  section: {
    marginTop: 16,
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  subsectionTitle: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: 16,
    marginBottom: 8,
  },
  currentSymbol: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
  },
  symbolGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  symbolButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  symbolButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  customSymbolContainer: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  customSymbolInput: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 14,
  },
  submitButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  settingLabel: {
    fontSize: 16,
  },
  pickerContainer: {
    borderRadius: 8,
    marginTop: 8,
    overflow: 'hidden',
  },
  aboutItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  aboutLabel: {
    fontSize: 14,
  },
  aboutValue: {
    fontSize: 14,
  },
  segmentedControl: {
    marginTop: 8,
  },
  assetTypeButtons: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  assetTypeButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  assetTypeButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  marketStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  marketStatusText: {
    fontSize: 14,
  },
});