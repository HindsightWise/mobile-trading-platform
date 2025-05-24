import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Dimensions,
} from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { useWebSocket } from '../contexts/WebSocketContext';
import { useTheme } from '../contexts/ThemeContext';

const { width: screenWidth } = Dimensions.get('window');

interface TradeRowProps {
  trade: {
    id: string;
    price: number;
    amount: number;
    time: number;
    isBuyerMaker: boolean;
  };
  previousPrice: number | null;
}

const TradeRow: React.FC<TradeRowProps> = ({ trade, previousPrice }) => {
  const { theme } = useTheme();
  const formattedTime = new Date(trade.time).toLocaleTimeString();
  const priceChange = previousPrice ? trade.price - previousPrice : 0;
  const priceChangePercent = previousPrice ? (priceChange / previousPrice) * 100 : 0;

  return (
    <View style={[styles.tradeRow, { borderBottomColor: theme.border }]}>
      <View style={styles.tradeLeft}>
        <Text
          style={[
            styles.tradePrice,
            { color: trade.isBuyerMaker ? theme.sell : theme.buy },
          ]}
        >
          ${trade.price.toFixed(2)}
        </Text>
        {previousPrice && (
          <Text
            style={[
              styles.priceChange,
              { color: priceChange >= 0 ? theme.buy : theme.sell },
            ]}
          >
            {priceChange >= 0 ? '+' : ''}{priceChangePercent.toFixed(2)}%
          </Text>
        )}
      </View>
      <Text style={[styles.tradeAmount, { color: theme.text }]}>
        {trade.amount.toFixed(6)}
      </Text>
      <Text style={[styles.tradeTime, { color: theme.textSecondary }]}>
        {formattedTime}
      </Text>
    </View>
  );
};

export default function TradesScreen() {
  const { trades, symbol } = useWebSocket();
  const { theme } = useTheme();

  // Calculate price chart data
  const chartData = useMemo(() => {
    if (trades.length === 0) {
      return {
        labels: [],
        datasets: [{ data: [0] }],
      };
    }

    const recentTrades = trades.slice(0, 20).reverse();
    const labels = recentTrades.map((_, index) => 
      index % 4 === 0 ? `${index}` : ''
    );
    const prices = recentTrades.map(trade => trade.price);

    return {
      labels,
      datasets: [{ data: prices }],
    };
  }, [trades]);

  // Calculate trade statistics
  const stats = useMemo(() => {
    if (trades.length === 0) {
      return {
        volume24h: 0,
        high24h: 0,
        low24h: 0,
        avgPrice: 0,
        buyVolume: 0,
        sellVolume: 0,
      };
    }

    const prices = trades.map(t => t.price);
    const volumes = trades.map(t => t.amount);
    const buyVolume = trades
      .filter(t => !t.isBuyerMaker)
      .reduce((sum, t) => sum + t.amount, 0);
    const sellVolume = trades
      .filter(t => t.isBuyerMaker)
      .reduce((sum, t) => sum + t.amount, 0);

    return {
      volume24h: volumes.reduce((sum, v) => sum + v, 0),
      high24h: Math.max(...prices),
      low24h: Math.min(...prices),
      avgPrice: prices.reduce((sum, p) => sum + p, 0) / prices.length,
      buyVolume,
      sellVolume,
    };
  }, [trades]);

  const buyVolumePercent = stats.volume24h > 0 
    ? (stats.buyVolume / stats.volume24h) * 100 
    : 50;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <Text style={[styles.title, { color: theme.text }]}>{symbol} Trades</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          Real-time trade history
        </Text>
      </View>

      {/* Price Chart */}
      {trades.length > 0 && (
        <View style={styles.chartContainer}>
          <LineChart
            data={chartData}
            width={screenWidth - 32}
            height={150}
            chartConfig={{
              backgroundColor: theme.surface,
              backgroundGradientFrom: theme.surface,
              backgroundGradientTo: theme.surface,
              decimalPlaces: 2,
              color: (opacity = 1) => theme.accent,
              labelColor: (opacity = 1) => theme.textSecondary,
              style: {
                borderRadius: 8,
              },
              propsForDots: {
                r: "3",
                strokeWidth: "1",
                stroke: theme.accent,
              },
            }}
            bezier
            style={styles.chart}
          />
        </View>
      )}

      {/* Statistics */}
      <View style={[styles.statsContainer, { backgroundColor: theme.surface }]}>
        <View style={styles.statRow}>
          <View style={styles.stat}>
            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>
              24h Volume
            </Text>
            <Text style={[styles.statValue, { color: theme.text }]}>
              {stats.volume24h.toFixed(2)}
            </Text>
          </View>
          <View style={styles.stat}>
            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>
              24h High
            </Text>
            <Text style={[styles.statValue, { color: theme.buy }]}>
              ${stats.high24h.toFixed(2)}
            </Text>
          </View>
          <View style={styles.stat}>
            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>
              24h Low
            </Text>
            <Text style={[styles.statValue, { color: theme.sell }]}>
              ${stats.low24h.toFixed(2)}
            </Text>
          </View>
        </View>

        {/* Buy/Sell Volume Bar */}
        <View style={styles.volumeBarContainer}>
          <Text style={[styles.volumeLabel, { color: theme.textSecondary }]}>
            Buy/Sell Volume
          </Text>
          <View style={[styles.volumeBar, { backgroundColor: theme.border }]}>
            <View
              style={[
                styles.buyVolumeBar,
                {
                  width: `${buyVolumePercent}%`,
                  backgroundColor: theme.buy,
                },
              ]}
            />
          </View>
          <View style={styles.volumeStats}>
            <Text style={[styles.volumeStat, { color: theme.buy }]}>
              Buy: {buyVolumePercent.toFixed(1)}%
            </Text>
            <Text style={[styles.volumeStat, { color: theme.sell }]}>
              Sell: {(100 - buyVolumePercent).toFixed(1)}%
            </Text>
          </View>
        </View>
      </View>

      {/* Trades List */}
      <View style={styles.tradesListContainer}>
        <View style={[styles.listHeader, { borderBottomColor: theme.border }]}>
          <Text style={[styles.listHeaderText, { color: theme.textSecondary }]}>
            Price
          </Text>
          <Text style={[styles.listHeaderText, { color: theme.textSecondary }]}>
            Amount
          </Text>
          <Text style={[styles.listHeaderText, { color: theme.textSecondary }]}>
            Time
          </Text>
        </View>
        <FlatList
          data={trades}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => (
            <TradeRow
              trade={item}
              previousPrice={index < trades.length - 1 ? trades[index + 1].price : null}
            />
          )}
          showsVerticalScrollIndicator={false}
        />
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
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  chartContainer: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  chart: {
    borderRadius: 8,
  },
  statsContainer: {
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  stat: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  volumeBarContainer: {
    marginTop: 16,
  },
  volumeLabel: {
    fontSize: 12,
    marginBottom: 8,
  },
  volumeBar: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  buyVolumeBar: {
    height: '100%',
  },
  volumeStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  volumeStat: {
    fontSize: 12,
    fontWeight: '500',
  },
  tradesListContainer: {
    flex: 1,
    marginHorizontal: 16,
  },
  listHeader: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  listHeaderText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '500',
  },
  tradeRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderBottomWidth: 1,
    alignItems: 'center',
  },
  tradeLeft: {
    flex: 1,
  },
  tradePrice: {
    fontSize: 14,
    fontWeight: '600',
  },
  priceChange: {
    fontSize: 11,
    marginTop: 2,
  },
  tradeAmount: {
    flex: 1,
    fontSize: 14,
    textAlign: 'center',
  },
  tradeTime: {
    flex: 1,
    fontSize: 12,
    textAlign: 'right',
  },
});