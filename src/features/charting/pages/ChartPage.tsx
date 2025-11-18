// src/features/charting/pages/ChartPage.tsx (대폭 수정)
import { useRef, useEffect } from 'react';
import { useParams } from 'react-router-dom'; // [추가] react-router-dom의 훅
import { useQuery } from '@tanstack/react-query';
import { useChartStore, useChartActions } from '../store/chartStore';
import { fetchHistoricalCandles } from '../api/chartApi';
import { chartWebSocket } from '../api/chartWebSocket';
import { useChart } from '../hooks/useChart';
// ...

export const ChartPage = () => {
  // 1. URL 파라미터 읽기
  const { symbol: symbolFromUrl } = useParams<{ symbol: string }>(); // (예: 'SPY')

  // 2. 스토어 상태 및 액션
  const timeframe = useChartStore((state) => state.timeframe);
  const { setSymbol } = useChartActions();

  // 3. URL의 심볼이 변경될 때마다 스토어에 반영
  useEffect(() => {
    if (symbolFromUrl) {
      setSymbol(symbolFromUrl);
    }
  }, [symbolFromUrl, setSymbol]); // symbolFromUrl이 바뀔 때마다 실행

  // 4. TanStack Query (서버 상태)
  const { data, isLoading } = useQuery({
    // [핵심] queryKey가 이제 URL 파라미터(동적)를 사용합니다.
    queryKey: ['candles', symbolFromUrl, timeframe],
    queryFn: () => fetchHistoricalCandles(symbolFromUrl!, timeframe),
    
    // symbolFromUrl이 유효할 때만 쿼리를 실행합니다.
    enabled: !!symbolFromUrl, 
  });

  // 5. WebSocket 초기화 (이전과 동일)
  useEffect(() => {
    chartWebSocket.getInstance();
  }, []);

  // 6. 차트 훅 (이전과 동일)
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const volumeContainerRef = useRef<HTMLDivElement>(null);
  useChart(chartContainerRef, volumeContainerRef, data || []);

  // 7. 렌더링
  if (isLoading) {
    return <div>{symbolFromUrl?.toUpperCase()} 차트 로딩 중...</div>;
  }
  
  return (
    <div style={{ padding: '20px', background: '#131722', color: '#D1D4DC' }}>
      {/* 이제 UI는 URL 파라미터를 기반으로 렌더링됩니다. */}
      <h2>{symbolFromUrl?.toUpperCase()} 차트 ...</h2>
      
      {/* (UI 컴포넌트 예시)
        <SymbolSelector 
          availableSymbols={['BTC/USD', 'SPY', 'QQQ']} 
          currentSymbol={symbolFromUrl!} 
        />
        (SymbolSelector는 이제 Link 태그나 navigate 함수로 URL을 변경시킵니다.)
      */}

      <div ref={chartContainerRef} style={{ /* ... */ }} />
      <div ref={volumeContainerRef} style={{ /* ... */ }} />
    </div>
  );
};