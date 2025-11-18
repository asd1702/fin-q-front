import { useChartStore } from '../store/chartStore';
// 방금 만든 queryClient 경로로 import
import { queryClient } from '../../../shared/api/queryClient'; 
import type { ChartData } from './chartApi';
import { getStartOfCandle } from '../utils/time';
import { UP_COLOR, DOWN_COLOR } from '../constants/chart';
import type { UTCTimestamp } from 'lightweight-charts';

const WS_URL = (import.meta.env.VITE_CHART_WS_URL || 'ws://localhost:8080').replace(/\/$/, '') + '/ws';

class ChartWebSocket {
  private static instance: ChartWebSocket;
  private ws: WebSocket | null = null;
  
  private constructor() {
    this.connect();
  }

  public static getInstance(): ChartWebSocket {
    if (!ChartWebSocket.instance) {
      ChartWebSocket.instance = new ChartWebSocket();
    }
    return ChartWebSocket.instance;
  }

  private connect() {
    const { setConnected } = useChartStore.getState().actions;

    this.ws = new WebSocket(WS_URL);

    this.ws.onopen = () => {
      console.log('WebSocket Connected');
      setConnected(true); 
    };

    this.ws.onclose = () => {
      console.log('WebSocket Disconnected');
      setConnected(false);
      setTimeout(() => this.connect(), 5000); 
    };

    this.ws.onmessage = (event) => {
      if (typeof event.data === 'string') {
        this.handleMessage(event.data);
      }
    };

    this.ws.onerror = (err) => {
      console.error('WS Error:', err);
    };
  }

  private handleMessage(data: string) {
    try {
      const msg = JSON.parse(data);
      const { symbol, timeframe } = useChartStore.getState();

      if (!symbol) return;

      const queryKey = ['candles', symbol, timeframe];

      // 1. 캔들 데이터 (완성봉)
      if (msg.type === 'candle' && msg.symbol === symbol && msg.timeframe === timeframe) {
        const c = msg.candle;
        const newCandle: ChartData = {
          candle: {
            time: c.startTime as UTCTimestamp,
            open: c.open,
            high: c.high,
            low: c.low,
            close: c.close,
          },
          volume: {
            time: c.startTime as UTCTimestamp,
            value: c.volume,
            color: c.close >= c.open ? UP_COLOR : DOWN_COLOR,
          },
        };

        queryClient.setQueryData(queryKey, (oldData: ChartData[] | undefined) => {
          if (!oldData) return [newCandle];
          const lastIdx = oldData.length - 1;
          if (oldData[lastIdx].candle.time === newCandle.candle.time) {
             const newData = [...oldData];
             newData[lastIdx] = newCandle;
             return newData;
          }
          return [...oldData, newCandle];
        });
      } 
      // 2. 틱 데이터 (실시간)
      else if (msg.type === 'tick' && msg.symbol === symbol) {
        const price = Number(msg.price);
        const timestamp = msg.timestamp;
        const volume = Number(msg.volume || 0);
        
        const candleStartTime = getStartOfCandle(timestamp, timeframe) as UTCTimestamp;

        queryClient.setQueryData(queryKey, (oldData: ChartData[] | undefined) => {
          if (!oldData || oldData.length === 0) return oldData;

          const newData = [...oldData];
          const lastIndex = newData.length - 1;
          const lastBar = newData[lastIndex];

          // Case A: 현재 봉 업데이트
          if ((lastBar.candle.time as number) === (candleStartTime as number)) {
            const updatedCandle = {
              ...lastBar.candle,
              close: price,
              high: Math.max(lastBar.candle.high, price),
              low: Math.min(lastBar.candle.low, price),
            };
            
            const updatedVolume = {
              ...lastBar.volume,
              value: lastBar.volume.value + volume, 
              color: updatedCandle.close >= updatedCandle.open ? UP_COLOR : DOWN_COLOR
            };
            newData[lastIndex] = { candle: updatedCandle, volume: updatedVolume };
          } 
          // Case B: 새로운 봉 생성
          else if ((lastBar.candle.time as number) < (candleStartTime as number)) {
            const newCandle: ChartData = {
              candle: { time: candleStartTime, open: price, high: price, low: price, close: price },
              volume: { time: candleStartTime, value: volume, color: UP_COLOR }
            };
            newData.push(newCandle);
          }
          return newData;
        });
      }
    } catch (err) {
      console.error('WS parse error', err);
    }
  }
}

export const chartWebSocket = ChartWebSocket.getInstance();