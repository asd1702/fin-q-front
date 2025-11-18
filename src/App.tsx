import { useEffect, useRef, useState } from 'react';
import {
 createChart,
 IChartApi,
 ColorType,
 CandlestickSeries,
 HistogramSeries,
 LineSeries,
 ISeriesApi,
} from 'lightweight-charts';
import type { CandlestickData, HistogramData, LineData, UTCTimestamp, LogicalRange } from 'lightweight-charts';

const TIMEFRAME_MINUTES: Record<string, number> = {
 '1m': 1,
 '5m': 5,
 '15m': 15,
 '1h': 60,
 '4h': 240,
};

const TIMEFRAMES = Object.keys(TIMEFRAME_MINUTES);

// [신규] 표시할 심볼 목록 (서버 설정과 일치시킴)
const SYMBOLS = ['BTC/USD', 'SPY', 'QQQ', 'DIA'];

function getStartOfCandle(timestamp: number, timeframe: string): number {
 const minutes = TIMEFRAME_MINUTES[timeframe] || 1;
 const seconds = minutes * 60;
 return Math.floor(timestamp / seconds) * seconds;
}

function App() {
 const chartContainerRef = useRef<HTMLDivElement>(null);
 const volumeContainerRef = useRef<HTMLDivElement>(null);

 const CHART_HEIGHT = 300;
 const VOLUME_CHART_HEIGHT = 100;

 const [connected, setConnected] = useState(false);
 // [수정] symbol을 state로 변경
 const [symbol, setSymbol] = useState('BTC/USD'); 
 const [timeframe, setTimeframe] = useState('1m');

 const chartApiRef = useRef<IChartApi | null>(null);
 const volumeChartApiRef = useRef<IChartApi | null>(null);
 const candlestickSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
 const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);
 const maSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
 const priceLineRef = useRef<ISeriesApi<'Line'> | null>(null);

 const candleDataRef = useRef<CandlestickData<UTCTimestamp>[]>([]);
 const volumeDataRef = useRef<HistogramData<UTCTimestamp>[]>([]);

 const [isLoadingHistory, setIsLoadingHistory] = useState(false);

 useEffect(() => {
  if (!chartContainerRef.current || !volumeContainerRef.current) {
   return;
  }

  const UP_COLOR = '#26a69a';
  const DOWN_COLOR = '#ef5350';

  // 1. 메인 차트 (다크 모드 적용됨)
  chartApiRef.current = createChart(chartContainerRef.current, {
   width: chartContainerRef.current.clientWidth,
   height: CHART_HEIGHT,
   layout: { 
    background: { type: ColorType.Solid, color: '#1E1E1E' }, 
    textColor: '#D1D4DC' },
   grid: {
    vertLines: { color: '#334158' },
    horzLines: { color: '#334158' },
   },
   rightPriceScale: {
    borderColor: '#485164',
    autoScale: true,
   },
   timeScale: { 
    visible: false, 
    timeVisible: true, 
    secondsVisible: false,
    borderColor: '#485164',
   },
  });

  candlestickSeriesRef.current = chartApiRef.current.addSeries(CandlestickSeries, {
   upColor: UP_COLOR, downColor: DOWN_COLOR, borderVisible: false, wickUpColor: UP_COLOR, wickDownColor: DOWN_COLOR,
  });

  maSeriesRef.current = chartApiRef.current.addSeries(LineSeries, { color: 'blue', lineWidth: 2 });
  priceLineRef.current = chartApiRef.current.addSeries(LineSeries, { color: 'red', lineWidth: 1, lineStyle: 2 });

  // 2. 거래량 차트 ([수정] 다크 모드 적용)
  volumeChartApiRef.current = createChart(volumeContainerRef.current, {
   width: volumeContainerRef.current.clientWidth,
   height: VOLUME_CHART_HEIGHT,
   layout: { 
    background: { type: ColorType.Solid, color: '#1E1E1E' }, 
    textColor: '#D1D4DC' 
   },
   grid: {
    vertLines: { color: '#334158' },
    horzLines: { color: '#334158' },
   },
   timeScale: { 
    visible: true, 
    timeVisible: true, 
    secondsVisible: false,
    borderColor: '#485164',
   },
  });

  volumeSeriesRef.current = volumeChartApiRef.current.addSeries(HistogramSeries, {
   priceFormat: { type: 'volume' },
  });

  const chart = chartApiRef.current;
  const volumeChart = volumeChartApiRef.current;
  const candlestickSeries = candlestickSeriesRef.current;
  const volumeSeries = volumeSeriesRef.current;
  const maSeries = maSeriesRef.current;
  const priceLine = priceLineRef.current;

  const API_BASE_URL = import.meta.env.VITE_CHART_API_URL || 'http://localhost:8080';

  let currentBar = {
   open: null as number | null, high: null as number | null, low: null as number | null,
   close: null as number | null, time: null as number | null, volume: 0,
  };

  async function loadData(beforeTime?: number) {
   if (isLoadingHistory) return;
   setIsLoadingHistory(true);

   try {
    const params = new URLSearchParams({ limit: '1000' });
    if (beforeTime) {
     params.set('to', String(beforeTime));
    }
        // [수정] API 호출 시 state의 symbol 사용
    const resp = await fetch(`${API_BASE_URL}/api/candles/${encodeURIComponent(symbol)}/${timeframe}?${params.toString()}`);
    const json = await resp.json();
    const data = json.data as Array<{ time: number; open: number; high: number; low: number; close: number; volume: number }>;

    if (!data || data.length === 0) {
     setIsLoadingHistory(false);
     return;
    }

    const newCandleData = data.map(d => ({
     time: d.time as UTCTimestamp, open: d.open, high: d.high, low: d.low, close: d.close
    }));
    const newVolumeData = data.map(d => ({
     time: d.time as UTCTimestamp, value: d.volume, color: d.close >= d.open ? UP_COLOR : DOWN_COLOR
    }));
    
    const candleMap = new Map([...newCandleData, ...candleDataRef.current].map(c => [c.time, c]));
    const volumeMap = new Map([...newVolumeData, ...volumeDataRef.current].map(v => [v.time, v]));

    candleDataRef.current = Array.from(candleMap.values()).sort((a, b) => a.time - b.time);
    volumeDataRef.current = Array.from(volumeMap.values()).sort((a, b) => a.time - b.time);
   
    candlestickSeries.setData(candleDataRef.current);
    volumeSeries.setData(volumeDataRef.current);

    const PERIOD = 20;
    const ma: LineData<UTCTimestamp>[] = [];
    const sourceData = candleDataRef.current;

    for (let i = 0; i < sourceData.length; i++) {
     if (i >= PERIOD - 1) {
      let sum = 0;
      for (let k = 0; k < PERIOD; k++) sum += sourceData[i - k].close;
      ma.push({ time: sourceData[i].time, value: sum / PERIOD });
     }
    }
    maSeries.setData(ma);

   } catch (e) {
    console.error('Data load failed', e);
   } finally {
    setIsLoadingHistory(false);
   }
  }
  
  candleDataRef.current = [];
  volumeDataRef.current = [];
  loadData();

  const WS_URL = (import.meta.env.VITE_CHART_WS_URL || 'ws://localhost:8080').replace(/\/$/, '') + '/ws';
  const ws = new WebSocket(WS_URL);

  ws.onopen = () => setConnected(true);
  ws.onclose = () => setConnected(false);
  ws.onerror = (e) => console.error('WS error', e);

  ws.onmessage = (ev) => {
   try {
    const msg = JSON.parse(ev.data);

        // [수정] candle 메시지에도 symbol 필터 추가
    if (msg.type === 'candle' && msg.symbol === symbol && msg.timeframe === timeframe) {
     const c = msg.candle;
     const t = c.startTime as UTCTimestamp;
     const updateData = { time: t, open: c.open, high: c.high, low: c.low, close: c.close };
     candlestickSeries.update(updateData);
     
     const volUpdate = {
      time: t, value: c.volume, color: c.close >= c.open ? UP_COLOR : DOWN_COLOR
     };
     volumeSeries.update(volUpdate);
     currentBar = { ...updateData, volume: c.volume, time: t as number };
    } 
    
        // tick 메시지는 (기존) symbol 필터가 이미 있음
    else if (msg.type === 'tick' && msg.symbol === symbol) {
     const price = Number(msg.price);
     const timestamp = msg.timestamp;
     const candleStartTime = getStartOfCandle(timestamp, timeframe);

     priceLine.update({ time: timestamp as UTCTimestamp, value: price });

     if (currentBar.time !== candleStartTime) {
      currentBar = {
       time: candleStartTime, open: price, high: price, low: price, close: price, volume: 0
      };
     } else {
      if (currentBar.high !== null && price > currentBar.high) currentBar.high = price;
      if (currentBar.low !== null && price < currentBar.low) currentBar.low = price;
      currentBar.close = price;
     }

     if (currentBar.time && currentBar.open !== null) {
      candlestickSeries.update({
       time: currentBar.time as UTCTimestamp,
       open: currentBar.open, high: currentBar.high!, low: currentBar.low!, close: currentBar.close!
      });
       volumeSeries.update({
        time: currentBar.time as UTCTimestamp, value: currentBar.volume,
        color: (currentBar.close || 0) >= currentBar.open ? UP_COLOR : DOWN_COLOR
      })
     }
    }
   } catch (err) {
    console.error('WS parse error', err);
   }
  };

  const handleVisibleLogicalRangeChange = (range: LogicalRange | null) => {
   if (chart.timeScale().getVisibleLogicalRange() === null) return;

   if (range && range.from < 20 && !isLoadingHistory) {
    const oldestTime = candleDataRef.current[0]?.time;
    if (oldestTime) {
     console.log('Loading history before:', oldestTime);
     loadData(oldestTime as number);
    }
   }

   if (range) {
    volumeChart.timeScale().setVisibleLogicalRange(range);
   }
  };
  
  chart.timeScale().subscribeVisibleLogicalRangeChange(handleVisibleLogicalRangeChange);

  volumeChart.timeScale().subscribeVisibleLogicalRangeChange(range => {
   if (range) chart.timeScale().setVisibleLogicalRange(range);
  });

  const handleResize = () => {
   if (chartContainerRef.current) {
    chart.resize(chartContainerRef.current.clientWidth, CHART_HEIGHT);
   }
   if (volumeContainerRef.current) {
    volumeChart.resize(volumeContainerRef.current.clientWidth, VOLUME_CHART_HEIGHT);
   }
  };
  window.addEventListener('resize', handleResize);

  return () => {
   window.removeEventListener('resize', handleResize);
   chart.remove();
   volumeChart.remove();
   ws.close();
   chartApiRef.current = null;
   volumeChartApiRef.current = null;
   candleDataRef.current = [];
   volumeDataRef.current = [];
  };

 }, [symbol, timeframe]); // [수정] symbol이 바뀌어도 useEffect 재실행

 return (
  <div style={{ padding: '20px', background: '#131722', color: '#D1D4DC' }}> {/* [수정] 전체 배경 다크 모드 */}
   <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        {/* [수정] h2 태그가 symbol state를 사용하도록 변경 */}
    <h2>{symbol} 차트 {connected ? '🟢' : '🔴'} {isLoadingHistory ? ' (로딩중...)' : ''}</h2>
    
        {/* [수정] Symbol 버튼과 Timeframe 버튼을 함께 배치 */}
    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {/* [신규] Symbol 버튼 */}
     <div style={{ display: 'flex', gap: '5px' }}>
      {SYMBOLS.map((s) => (
       <button
        key={s}
        onClick={() => setSymbol(s)}
        style={{
         padding: '8px 16px', cursor: 'pointer',
         fontWeight: symbol === s ? 'bold' : 'normal',
         backgroundColor: symbol === s ? '#2196F3' : '#334158',
         color: symbol === s ? '#fff' : '#D1D4DC',
         border: 'none', borderRadius: '4px'
        }}
        >
         {s}
        </button>
      ))}
     </div>

          {/* 구분선 */}
     <div style={{ borderLeft: '2px solid #334158', height: '30px' }}></div>

          {/* Timeframe 버튼 */}
     <div style={{ display: 'flex', gap: '5px' }}>
      {TIMEFRAMES.map((tf) => (
       <button
        key={tf}
        onClick={() => setTimeframe(tf)}
        style={{
         padding: '8px 16px', cursor: 'pointer',
         fontWeight: timeframe === tf ? 'bold' : 'normal',
         backgroundColor: timeframe === tf ? '#2196F3' : '#334158',
         color: timeframe === tf ? '#fff' : '#D1D4DC',
         border: 'none', borderRadius: '4px'
        }}
       >
        {tf}
       </button>
      ))}
     </div>
    </div>
   </div>

   <div ref={chartContainerRef} style={{ width: '100%', height: `${CHART_HEIGHT}px`, border: '1px solid #334158' }} />
   <div ref={volumeContainerRef} style={{ width: '100%', height: `${VOLUME_CHART_HEIGHT}px`, border: '1px solid #334158', borderTop: 'none' }} />
  </div>
 );
}

export default App;