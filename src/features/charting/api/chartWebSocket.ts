// src/features/charting/api/chartWebSocket.ts (새 파일)
import { useChartStore } from '../store/chartStore';

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
      setConnected(true); // [핵심] Zustand 스토어 직접 업데이트
    };

    this.ws.onclose = () => {
      console.log('WebSocket Disconnected');
      setConnected(false); // [핵심] Zustand 스토어 직접 업데이트
      setTimeout(() => this.connect(), 5000); // 5초 후 재연결
    };

    this.ws.onmessage = (event) => {
      // (6단계에서 이어서)
      // 이곳에서 TanStack Query 캐시를 업데이트합니다.
      this.handleMessage(event.data);
    };

    this.ws.onerror = (err) => {
      console.error('WS Error:', err);
    };
  }

  private handleMessage(data: string) {
    try {
      const msg = JSON.parse(data);
      const { symbol, timeframe } = useChartStore.getState();

      // (기존 App.tsx의 필터링 로직)
      if (msg.type === 'candle' && msg.symbol === symbol && msg.timeframe === timeframe) {
        // TODO: TanStack Query 캐시 업데이트 로직
        console.log('Realtime Candle:', msg.candle);
      } else if (msg.type === 'tick' && msg.symbol === symbol) {
        // TODO: TanStack Query 캐시 업데이트 로직 (가격 라인용)
        console.log('Realtime Tick:', msg.price);
      }

    } catch (err) {
      console.error('WS message parse error', err);
    }
  }
}

// 싱글톤 인스턴스를 export
export const chartWebSocket = ChartWebSocket.getInstance();