import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { useWebSocket } from '../contexts/WebSocketContext';
import { useTheme } from '../contexts/ThemeContext';

const { width } = Dimensions.get('window');

interface OrderBookRowProps {
  price: number;
  amount: number;
  total: number;
  maxTotal: number;
  type: 'bid' | 'ask';
}

const OrderBookRow: React.FC<OrderBookRowProps> = ({
  price,
  amount,
  total,
  maxTotal,
  type,
}) => {
  const { theme } = useTheme();
  const percentage = (total / maxTotal) * 100;

  return (
    <TouchableOpacity style={styles.row}>
      <View
        style={[
          styles.depthBar,
          {
            width: `${percentage}%`,
            backgroundColor: type === 'bid' ? `${theme.buy}20` : `${theme.sell}20`,
          },
        ]}
      />
      <Text style={[styles.price, { color: type === 'bid' ? theme.buy : theme.sell }]}>
        {price.toFixed(2)}
      </Text>
      <Text style={[styles.amount, { color: theme.text }]}>{amount.toFixed(6)}</Text>
      <Text style={[styles.total, { color: theme.textSecondary }]}>
        ${(price * amount).toFixed(2)}
      </Text>
    </TouchableOpacity>
  );
};

export default function OrderBookScreen() {
  const { orderBook, isConnected, symbol, assetType, marketData } = useWebSocket();
  const { theme } = useTheme();

  const { bidsWithTotal, asksWithTotal, maxTotal } = useMemo(() => {
    if (!orderBook) {
      return { bidsWithTotal: [], asksWithTotal: [], maxTotal: 0 };
    }

    let bidTotal = 0;
    const bidsWithTotal = orderBook.bids.slice(0, 15).map(([price, amount]) => {
      bidTotal += amount;
      return { price, amount, total: bidTotal };
    });

    let askTotal = 0;
    const asksWithTotal = orderBook.asks.slice(0, 15).map(([price, amount]) => {
      askTotal += amount;
      return { price, amount, total: askTotal };
    });

    const maxTotal = Math.max(bidTotal, askTotal);

    return { bidsWithTotal, asksWithTotal, maxTotal };
  }, [orderBook]);

  const spread = useMemo(() => {
    if (!orderBook || !orderBook.asks[0] || !orderBook.bids[0]) return 0;
    return orderBook.asks[0][0] - orderBook.bids[0][0];
  }, [orderBook]);

  const spreadPercentage = useMemo(() => {
    if (!orderBook || !orderBook.asks[0] || !orderBook.bids[0]) return 0;
    const midPrice = (orderBook.asks[0][0] + orderBook.bids[0][0]) / 2;
    return (spread / midPrice) * 100;
  }, [orderBook, spread]);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <View style={styles.symbolContainer}>
          <Text style={[styles.symbol, { color: theme.text }]}>{symbol}</Text>
          <View
            style={[
              styles.connectionDot,
              { backgroundColor: isConnected ? theme.success : theme.sell },
            ]}
          />
        </View>
        <View style={styles.spreadContainer}>
          <Text style={[styles.spreadLabel, { color: theme.textSecondary }]}>Spread</Text>
          <Text style={[styles.spreadValue, { color: theme.text }]}>
            ${spread.toFixed(2)} ({spreadPercentage.toFixed(3)}%)
          </Text>
          {marketData && assetType === 'stock' && marketData.marketCap && (
            <>
              <Text style={[styles.spreadLabel, { color: theme.textSecondary, marginTop: 4 }]}>
                Market Cap
              </Text>
              <Text style={[styles.spreadValue, { color: theme.text }]}>
                ${(marketData.marketCap / 1000000000).toFixed(1)}B
              </Text>
            </>
          )}
        </View>
      </View>

      {/* Column Headers */}
      <View style={[styles.columnHeaders, { borderBottomColor: theme.border }]}>
        <Text style={[styles.columnHeader, { color: theme.textSecondary }]}>Price</Text>
        <Text style={[styles.columnHeader, { color: theme.textSecondary }]}>
          {assetType === 'stock' ? 'Shares' : 'Amount'}
        </Text>
        <Text style={[styles.columnHeader, { color: theme.textSecondary }]}>Total</Text>
      </View>

      {/* Order Book */}
      <View style={styles.orderBookContainer}>
        {/* Asks */}
        <FlatList
          data={asksWithTotal.reverse()}
          keyExtractor={(item, index) => `ask-${index}`}
          renderItem={({ item }) => (
            <OrderBookRow
              price={item.price}
              amount={item.amount}
              total={item.total}
              maxTotal={maxTotal}
              type="ask"
            />
          )}
          style={styles.asksList}
          showsVerticalScrollIndicator={false}
        />

        {/* Mid Price */}
        <View style={[styles.midPriceContainer, { backgroundColor: theme.surface }]}>
          <Text style={[styles.midPriceLabel, { color: theme.textSecondary }]}>
            Mid Price
          </Text>
          <Text style={[styles.midPrice, { color: theme.accent }]}>
            ${orderBook && orderBook.asks[0] && orderBook.bids[0]
              ? ((orderBook.asks[0][0] + orderBook.bids[0][0]) / 2).toFixed(2)
              : '0.00'}
          </Text>
        </View>

        {/* Bids */}
        <FlatList
          data={bidsWithTotal}
          keyExtractor={(item, index) => `bid-${index}`}
          renderItem={({ item }) => (
            <OrderBookRow
              price={item.price}
              amount={item.amount}
              total={item.total}
              maxTotal={maxTotal}
              type="bid"
            />
          )}
          style={styles.bidsList}
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  symbolContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  symbol: {
    fontSize: 20,
    fontWeight: '600',
  },
  connectionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  spreadContainer: {
    alignItems: 'flex-end',
  },
  spreadLabel: {
    fontSize: 12,
  },
  spreadValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  columnHeaders: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  columnHeader: {
    flex: 1,
    fontSize: 12,
    fontWeight: '500',
  },
  orderBookContainer: {
    flex: 1,
  },
  asksList: {
    flex: 1,
  },
  bidsList: {
    flex: 1,
  },
  row: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    position: 'relative',
  },
  depthBar: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    opacity: 0.3,
  },
  price: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },
  amount: {
    flex: 1,
    fontSize: 14,
  },
  total: {
    flex: 1,
    fontSize: 14,
    textAlign: 'right',
  },
  midPriceContainer: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  midPriceLabel: {
    fontSize: 12,
  },
  midPrice: {
    fontSize: 16,
    fontWeight: '600',
  },
});