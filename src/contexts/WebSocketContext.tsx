import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';

interface OrderBookData {
  bids: Array<[number, number]>; // [price, amount/size]
  asks: Array<[number, number]>; // [price, amount/size]
  lastUpdateId: number;
}

interface Trade {
  id: string;
  price: number;
  amount: number;
  time: number;
  isBuyerMaker: boolean;
}

interface MarketData {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  high: number;
  low: number;
  marketCap?: number;
}

type AssetType = 'crypto' | 'stock';
type DataProvider = 'binance' | 'alpaca' | 'polygon' | 'demo';

interface WebSocketContextType {
  orderBook: OrderBookData | null;
  trades: Trade[];
  isConnected: boolean;
  symbol: string;
  setSymbol: (symbol: string) => void;
  assetType: AssetType;
  setAssetType: (type: AssetType) => void;
  provider: DataProvider;
  setProvider: (provider: DataProvider) => void;
  marketData: MarketData | null;
  reconnect: () => void;
  isMarketOpen: boolean;
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within WebSocketProvider');
  }
  return context;
};

// Demo data generators
const generateDemoOrderBook = (basePrice: number): OrderBookData => {
  const spread = basePrice * 0.0001; // 0.01% spread
  const bids: Array<[number, number]> = [];
  const asks: Array<[number, number]> = [];
  
  for (let i = 0; i < 20; i++) {
    bids.push([
      parseFloat((basePrice - spread - i * spread).toFixed(2)),
      parseFloat((Math.random() * 1000).toFixed(2))
    ]);
    asks.push([
      parseFloat((basePrice + spread + i * spread).toFixed(2)),
      parseFloat((Math.random() * 1000).toFixed(2))
    ]);
  }
  
  return { bids, asks, lastUpdateId: Date.now() };
};

const generateDemoTrade = (basePrice: number, id: number): Trade => {
  const variance = basePrice * 0.001;
  return {
    id: `trade-${id}`,
    price: parseFloat((basePrice + (Math.random() - 0.5) * variance).toFixed(2)),
    amount: parseFloat((Math.random() * 100).toFixed(2)),
    time: Date.now(),
    isBuyerMaker: Math.random() > 0.5,
  };
};

// Stock market hours checker (Eastern Time)
const isStockMarketOpen = (): boolean => {
  const now = new Date();
  const day = now.getDay();
  const hours = now.getHours();
  const minutes = now.getMinutes();
  
  // Closed on weekends
  if (day === 0 || day === 6) return false;
  
  // Market hours: 9:30 AM - 4:00 PM ET
  // This is simplified - you'd need proper timezone handling
  const currentTime = hours * 60 + minutes;
  const marketOpen = 9 * 60 + 30;
  const marketClose = 16 * 60;
  
  return currentTime >= marketOpen && currentTime < marketClose;
};

// Default symbols
const DEFAULT_SYMBOLS = {
  crypto: 'BTCUSDT',
  stock: 'AAPL',
};

// Demo prices for different assets
const DEMO_PRICES: Record<string, number> = {
  BTCUSDT: 45000,
  ETHUSDT: 2500,
  AAPL: 175,
  GOOGL: 140,
  TSLA: 250,
  MSFT: 380,
  AMZN: 170,
  NVDA: 480,
};

interface Props {
  children: React.ReactNode;
}

export const WebSocketProvider: React.FC<Props> = ({ children }) => {
  const [orderBook, setOrderBook] = useState<OrderBookData | null>(null);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [assetType, setAssetType] = useState<AssetType>('crypto');
  const [symbol, setSymbol] = useState(DEFAULT_SYMBOLS[assetType]);
  const [provider, setProvider] = useState<DataProvider>('demo'); // Start with demo
  const [marketData, setMarketData] = useState<MarketData | null>(null);
  const [isMarketOpen, setIsMarketOpen] = useState(true);
  
  const ws = useRef<WebSocket | null>(null);
  const reconnectTimeout = useRef<NodeJS.Timeout | null>(null);
  const demoInterval = useRef<NodeJS.Timeout | null>(null);
  const tradeCounter = useRef(0);

  // Update symbol when asset type changes
  useEffect(() => {
    setSymbol(DEFAULT_SYMBOLS[assetType]);
  }, [assetType]);

  // Check market hours for stocks
  useEffect(() => {
    if (assetType === 'stock') {
      const checkMarket = () => {
        setIsMarketOpen(isStockMarketOpen());
      };
      checkMarket();
      const interval = setInterval(checkMarket, 60000); // Check every minute
      return () => clearInterval(interval);
    } else {
      setIsMarketOpen(true); // Crypto is 24/7
    }
  }, [assetType]);

  const processOrderBookUpdate = useCallback((data: any) => {
    if (provider === 'binance' && data.e === 'depthUpdate') {
      const newOrderBook = { ...orderBook } as OrderBookData;
      
      // Process binance depth update
      data.b.forEach(([price, amount]: [string, string]) => {
        const priceNum = parseFloat(price);
        const amountNum = parseFloat(amount);
        
        if (amountNum === 0) {
          newOrderBook.bids = newOrderBook.bids.filter(([p]) => p !== priceNum);
        } else {
          const index = newOrderBook.bids.findIndex(([p]) => p === priceNum);
          if (index >= 0) {
            newOrderBook.bids[index] = [priceNum, amountNum];
          } else {
            newOrderBook.bids.push([priceNum, amountNum]);
          }
        }
      });
      
      // Similar for asks...
      newOrderBook.bids.sort((a, b) => b[0] - a[0]);
      newOrderBook.asks.sort((a, b) => a[0] - b[0]);
      
      setOrderBook(newOrderBook);
    }
  }, [orderBook, provider]);

  const processTrade = useCallback((data: any) => {
    if (provider === 'binance' && data.e === 'trade') {
      const newTrade: Trade = {
        id: data.t.toString(),
        price: parseFloat(data.p),
        amount: parseFloat(data.q),
        time: data.T,
        isBuyerMaker: data.m,
      };
      
      setTrades(prevTrades => [newTrade, ...prevTrades].slice(0, 100));
    }
  }, [provider]);

  const connectDemo = useCallback(() => {
    setIsConnected(true);
    const basePrice = DEMO_PRICES[symbol] || 100;
    
    // Initialize with demo data
    setOrderBook(generateDemoOrderBook(basePrice));
    setMarketData({
      symbol,
      price: basePrice,
      change: (Math.random() - 0.5) * 5,
      changePercent: (Math.random() - 0.5) * 2,
      volume: Math.floor(Math.random() * 1000000),
      high: basePrice * 1.02,
      low: basePrice * 0.98,
      marketCap: assetType === 'stock' ? Math.floor(Math.random() * 1000000000) : undefined,
    });
    
    // Simulate real-time updates
    demoInterval.current = setInterval(() => {
      const currentPrice = basePrice + (Math.random() - 0.5) * basePrice * 0.001;
      
      // Update order book
      setOrderBook(generateDemoOrderBook(currentPrice));
      
      // Add new trades
      const newTrade = generateDemoTrade(currentPrice, tradeCounter.current++);
      setTrades(prev => [newTrade, ...prev].slice(0, 100));
      
      // Update market data
      setMarketData(prev => ({
        ...prev!,
        price: currentPrice,
        change: currentPrice - basePrice,
        changePercent: ((currentPrice - basePrice) / basePrice) * 100,
      }));
    }, 1000);
  }, [symbol, assetType]);

  const connectBinance = useCallback(() => {
    const streams = [
      `${symbol.toLowerCase()}@depth@100ms`,
      `${symbol.toLowerCase()}@trade`
    ];
    
    const wsUrl = `wss://stream.binance.com:443/stream?streams=${streams.join('/')}`;
    
    ws.current = new WebSocket(wsUrl);
    
    ws.current.onopen = () => {
      console.log('Binance WebSocket Connected');
      setIsConnected(true);
      
      // Request snapshot
      fetch(`https://api.binance.com/api/v3/depth?symbol=${symbol}&limit=50`)
        .then(res => res.json())
        .then(snapshot => {
          const processedSnapshot: OrderBookData = {
            bids: snapshot.bids.map(([p, a]: [string, string]) => [parseFloat(p), parseFloat(a)]),
            asks: snapshot.asks.map(([p, a]: [string, string]) => [parseFloat(p), parseFloat(a)]),
            lastUpdateId: snapshot.lastUpdateId,
          };
          setOrderBook(processedSnapshot);
        })
        .catch(console.error);
    };
    
    ws.current.onmessage = (event) => {
      const message = JSON.parse(event.data);
      const data = message.data;
      
      if (data.e === 'depthUpdate') {
        processOrderBookUpdate(data);
      } else if (data.e === 'trade') {
        processTrade(data);
      }
    };
    
    ws.current.onerror = (error) => {
      console.error('WebSocket error:', error);
      setIsConnected(false);
    };
    
    ws.current.onclose = () => {
      console.log('WebSocket disconnected');
      setIsConnected(false);
      
      // Reconnect after 3 seconds
      reconnectTimeout.current = setTimeout(() => {
        connect();
      }, 3000);
    };
  }, [symbol, processOrderBookUpdate, processTrade]);

  const connect = useCallback(() => {
    // Clean up existing connections
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.close();
    }
    if (demoInterval.current) {
      clearInterval(demoInterval.current);
    }

    // Connect based on provider
    switch (provider) {
      case 'demo':
        connectDemo();
        break;
      case 'binance':
        if (assetType === 'crypto') {
          connectBinance();
        } else {
          console.log('Binance only supports crypto');
          connectDemo(); // Fallback to demo
        }
        break;
      case 'alpaca':
      case 'polygon':
        // TODO: Implement real stock data providers
        console.log(`${provider} integration coming soon`);
        connectDemo(); // Fallback to demo for now
        break;
    }
  }, [provider, assetType, connectDemo, connectBinance]);

  const reconnect = useCallback(() => {
    if (reconnectTimeout.current) {
      clearTimeout(reconnectTimeout.current);
    }
    connect();
  }, [connect]);

  useEffect(() => {
    connect();
    
    return () => {
      if (ws.current) {
        ws.current.close();
      }
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current);
      }
      if (demoInterval.current) {
        clearInterval(demoInterval.current);
      }
    };
  }, [connect]);

  const value: WebSocketContextType = {
    orderBook,
    trades,
    isConnected,
    symbol,
    setSymbol,
    assetType,
    setAssetType,
    provider,
    setProvider,
    marketData,
    reconnect,
    isMarketOpen,
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
};