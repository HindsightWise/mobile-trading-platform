import React, { useEffect, useRef, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  PanResponder,
  Animated,
  TouchableOpacity,
} from 'react-native';
import Svg, { Rect, Text as SvgText, G } from 'react-native-svg';
import { useWebSocket } from '../contexts/WebSocketContext';
import { useTheme } from '../contexts/ThemeContext';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const CHART_HEIGHT = screenHeight * 0.6;
const CHART_WIDTH = screenWidth - 32;

interface HeatmapCell {
  price: number;
  amount: number;
  timestamp: number;
  type: 'bid' | 'ask';
}

export default function HeatmapScreen() {
  const { orderBook, trades, isConnected, symbol } = useWebSocket();
  const { theme } = useTheme();
  const [heatmapData, setHeatmapData] = useState<HeatmapCell[][]>([]);
  const [priceRange, setPriceRange] = useState({ min: 0, max: 0 });
  const [selectedCell, setSelectedCell] = useState<HeatmapCell | null>(null);
  
  const pan = useRef(new Animated.ValueXY()).current;
  const scale = useRef(new Animated.Value(1)).current;

  // Update heatmap data
  useEffect(() => {
    if (!orderBook) return;

    const newColumn: HeatmapCell[] = [];
    const timestamp = Date.now();

    // Add bids
    orderBook.bids.slice(0, 20).forEach(([price, amount]) => {
      newColumn.push({ price, amount, timestamp, type: 'bid' });
    });

    // Add asks
    orderBook.asks.slice(0, 20).forEach(([price, amount]) => {
      newColumn.push({ price, amount, timestamp, type: 'ask' });
    });

    setHeatmapData(prev => {
      const updated = [...prev, newColumn];
      // Keep last 60 columns (60 seconds of data)
      return updated.slice(-60);
    });

    // Update price range
    if (newColumn.length > 0) {
      const prices = newColumn.map(cell => cell.price);
      setPriceRange({
        min: Math.min(...prices),
        max: Math.max(...prices),
      });
    }
  }, [orderBook]);

  // Pan responder for touch interactions
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        pan.setOffset({
          x: (pan.x as any)._value,
          y: (pan.y as any)._value,
        });
      },
      onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], {
        useNativeDriver: false,
      }),
      onPanResponderRelease: () => {
        pan.flattenOffset();
      },
    })
  ).current;

  // Calculate color intensity based on amount
  const getColorIntensity = (amount: number, maxAmount: number) => {
    const intensity = Math.min(amount / maxAmount, 1);
    return Math.floor(intensity * 255);
  };

  const maxAmount = useMemo(() => {
    return Math.max(
      ...heatmapData.flat().map(cell => cell.amount),
      1
    );
  }, [heatmapData]);

  const renderHeatmapCells = () => {
    const cellWidth = CHART_WIDTH / 60;
    const cellHeight = CHART_HEIGHT / 40;

    return heatmapData.map((column, columnIndex) => {
      return column.map((cell, rowIndex) => {
        const y = ((cell.price - priceRange.min) / (priceRange.max - priceRange.min)) * CHART_HEIGHT;
        const intensity = getColorIntensity(cell.amount, maxAmount);
        
        const color = cell.type === 'bid' 
          ? `rgba(63, 185, 80, ${intensity / 255})`  // Green for bids
          : `rgba(248, 81, 73, ${intensity / 255})`;  // Red for asks

        return (
          <Rect
            key={`${columnIndex}-${rowIndex}`}
            x={columnIndex * cellWidth}
            y={CHART_HEIGHT - y - cellHeight}
            width={cellWidth}
            height={cellHeight}
            fill={color}
            onPress={() => setSelectedCell(cell)}
          />
        );
      });
    });
  };

  const renderPriceAxis = () => {
    const priceSteps = 10;
    const stepSize = (priceRange.max - priceRange.min) / priceSteps;

    return Array.from({ length: priceSteps + 1 }).map((_, i) => {
      const price = priceRange.min + i * stepSize;
      const y = CHART_HEIGHT - (i * CHART_HEIGHT) / priceSteps;

      return (
        <G key={i}>
          <SvgText
            x={CHART_WIDTH + 5}
            y={y + 5}
            fontSize="10"
            fill={theme.textSecondary}
          >
            ${price.toFixed(0)}
          </SvgText>
        </G>
      );
    });
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <View>
          <Text style={[styles.title, { color: theme.text }]}>
            Order Book Heatmap
          </Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            {symbol} - Last 60 seconds
          </Text>
        </View>
        <View style={styles.legendContainer}>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: theme.buy }]} />
            <Text style={[styles.legendText, { color: theme.textSecondary }]}>
              Bids
            </Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: theme.sell }]} />
            <Text style={[styles.legendText, { color: theme.textSecondary }]}>
              Asks
            </Text>
          </View>
        </View>
      </View>

      {/* Heatmap Chart */}
      <Animated.View
        style={[
          styles.chartContainer,
          {
            transform: [
              { translateX: pan.x },
              { translateY: pan.y },
              { scale: scale },
            ],
          },
        ]}
        {...panResponder.panHandlers}
      >
        <Svg width={CHART_WIDTH + 50} height={CHART_HEIGHT}>
          {heatmapData.length > 0 && renderHeatmapCells()}
          {priceRange.max > 0 && renderPriceAxis()}
        </Svg>
      </Animated.View>

      {/* Selected Cell Info */}
      {selectedCell && (
        <View style={[styles.infoPanel, { backgroundColor: theme.surface }]}>
          <Text style={[styles.infoTitle, { color: theme.text }]}>
            Selected Order
          </Text>
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>
              Price:
            </Text>
            <Text style={[styles.infoValue, { color: theme.text }]}>
              ${selectedCell.price.toFixed(2)}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>
              Amount:
            </Text>
            <Text style={[styles.infoValue, { color: theme.text }]}>
              {selectedCell.amount.toFixed(6)}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>
              Type:
            </Text>
            <Text
              style={[
                styles.infoValue,
                { color: selectedCell.type === 'bid' ? theme.buy : theme.sell },
              ]}
            >
              {selectedCell.type.toUpperCase()}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.closeButton, { backgroundColor: theme.border }]}
            onPress={() => setSelectedCell(null)}
          >
            <Text style={[styles.closeButtonText, { color: theme.text }]}>
              Close
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Controls */}
      <View style={[styles.controls, { backgroundColor: theme.surface }]}>
        <TouchableOpacity
          style={[styles.controlButton, { backgroundColor: theme.border }]}
          onPress={() => {
            Animated.spring(scale, {
              toValue: Math.min((scale as any)._value * 1.2, 3),
              useNativeDriver: true,
            }).start();
          }}
        >
          <Text style={[styles.controlButtonText, { color: theme.text }]}>+</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.controlButton, { backgroundColor: theme.border }]}
          onPress={() => {
            Animated.spring(scale, {
              toValue: Math.max((scale as any)._value * 0.8, 0.5),
              useNativeDriver: true,
            }).start();
          }}
        >
          <Text style={[styles.controlButtonText, { color: theme.text }]}>-</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.controlButton, { backgroundColor: theme.border }]}
          onPress={() => {
            Animated.parallel([
              Animated.spring(pan, {
                toValue: { x: 0, y: 0 },
                useNativeDriver: true,
              }),
              Animated.spring(scale, {
                toValue: 1,
                useNativeDriver: true,
              }),
            ]).start();
          }}
        >
          <Text style={[styles.controlButtonText, { color: theme.text }]}>
            Reset
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  legendContainer: {
    flexDirection: 'row',
    gap: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 2,
  },
  legendText: {
    fontSize: 12,
  },
  chartContainer: {
    flex: 1,
    padding: 16,
  },
  infoPanel: {
    position: 'absolute',
    bottom: 100,
    left: 16,
    right: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 14,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  closeButton: {
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  controls: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    flexDirection: 'column',
    gap: 8,
    padding: 8,
    borderRadius: 8,
  },
  controlButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlButtonText: {
    fontSize: 18,
    fontWeight: '600',
  },
});