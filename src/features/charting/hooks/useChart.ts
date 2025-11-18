// src/features/charting/hooks/useChart.ts (새 파일)
import { useEffect, useRef } from 'react';
import { createChart, IChartApi, ISeriesApi, CandlestickSeries, HistogramSeries, ColorType } from 'lightweight-charts';
import type { ChartData } from '../api/chartApi';
import { CHART_HEIGHT, VOLUME_CHART_HEIGHT } from '../constants/chart';

export const useChart = (
  chartContainerRef: React.RefObject<HTMLDivElement>,
  volumeContainerRef: React.RefObject<HTMLDivElement>,
  data: ChartData[] // React Query가 제공할 데이터
) => {
  const chartApiRef = useRef<IChartApi | null>(null);
  const volumeApiRef = useRef<IChartApi | null>(null);
  const candlestickSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);

  // 1. 차트 생성 (마운트 시)
  useEffect(() => {
    if (!chartContainerRef.current || !volumeContainerRef.current) return;
    
    // (기존 App.tsx의 차트 생성 로직)
    const chartApi = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: CHART_HEIGHT,
      layout: { background: { type: ColorType.Solid, color: '#1E1E1E' }, /* ... */ },
      timeScale: { visible: false, /* ... */ },
      // ... (기타 메인 차트 설정)
    });
    candlestickSeriesRef.current = chartApi.addSeries(CandlestickSeries, { /* ... */ });
    
    const volumeApi = createChart(volumeContainerRef.current, {
      width: volumeContainerRef.current.clientWidth,
      height: VOLUME_CHART_HEIGHT,
      layout: { background: { type: ColorType.Solid, color: '#1E1E1E' }, /* ... */ },
      timeScale: { visible: true, /* ... */ },
      // ... (기타 볼륨 차트 설정)
    });
    volumeSeriesRef.current = volumeApi.addSeries(HistogramSeries, { /* ... */ });

    // 스크롤 동기화
    chartApi.timeScale().subscribeVisibleLogicalRangeChange(range => {
      if (range) volumeApi.timeScale().setVisibleLogicalRange(range);
    });
    volumeApi.timeScale().subscribeVisibleLogicalRangeChange(range => {
      if (range) chartApi.timeScale().setVisibleLogicalRange(range);
    });
    
    // 리사이즈 핸들러
    const handleResize = () => {
      if (chartContainerRef.current) chartApi.resize(chartContainerRef.current.clientWidth, CHART_HEIGHT);
      if (volumeContainerRef.current) volumeApi.resize(volumeContainerRef.current.clientWidth, VOLUME_CHART_HEIGHT);
    };
    window.addEventListener('resize', handleResize);

    chartApiRef.current = chartApi;
    volumeApiRef.current = volumeApi;

    return () => {
      window.removeEventListener('resize', handleResize);
      chartApi.remove();
      volumeApi.remove();
    };
  }, []); // 의존성 배열 []: 마운트 시 1회만 실행

  // 2. 데이터 주입 (데이터 변경 시)
  useEffect(() => {
    if (!data) return;

    const candleData = data.map(d => d.candle);
    const volumeData = data.map(d => d.volume);

    if (candlestickSeriesRef.current) {
      candlestickSeriesRef.current.setData(candleData);
    }
    if (volumeSeriesRef.current) {
      volumeSeriesRef.current.setData(volumeData);
    }
    
    // (MA 계산 및 주입 로직도 여기에 추가)
    // const maData = calculateMA(candleData, 20);
    // maSeriesRef.current.setData(maData);

  }, [data]); // 의존성 배열 [data]: data가 바뀔 때마다 실행
};