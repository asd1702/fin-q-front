import { create } from 'zustand';

interface ChartState {
    symbol: string | null;
    timeframe: string;
    connected: boolean;
    actions: {
        setSymbol: (symbol: string) => void;
        setTimeframe: (timeframe: string) => void;
        setConnected: (status: boolean) => void;
    }
}
export const useChartStore = create<ChartState>((set) => ({
  symbol: null, // 기본값
  timeframe: '1m', // 기본값
  connected: false,
  actions: {
    setSymbol: (symbol) => set({ symbol }),
    setTimeframe: (timeframe) => set({ timeframe }),
    setConnected: (status) => set({ connected: status }),
  }
}));

// 꿀팁: 컴포넌트에서 action과 state를 분리해서 사용하면 리렌더링 최적화에 좋습니다.
export const useChartActions = () => useChartStore((state) => state.actions);
