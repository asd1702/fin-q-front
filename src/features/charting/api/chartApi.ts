import type { UTCTimestamp } from 'lightweight-charts';

export interface CandleDataDTO{
    time:   number;
    open:   number;
    high:   number;
    low:    number;
    close:  number;
    volume: number;
}

export interface ChartData {
    candle: {
        time:   UTCTimestamp;
        open:   number;
        high:   number;
        low:    number;
        close:  number;  
    };
    volume: {
        time:   UTCTimestamp;
        value:  number;
        color:  string;
    };
}

const API_BASE_URL = import.meta.env.VITE_CHART_API_URL || 'http://localhost:8080';
const UP_COLOR =    '#26a69a';
const DOWN_COLOR =  '#ef5350';

export const fetchHistoricalCandles = async (symbol: string, timeframe: string): Promise<ChartData[]> => {
    const params = new URLSearchParams({ limit: '1000' });

    const resp = await fetch(`${API_BASE_URL}/api/candles/${encodeURIComponent(symbol)}/${timeframe}?${params.toString()}`);
    if(!resp.ok){
        throw new Error('Failed to fetch historical data');
    }
    const json = await resp.json();
    const data = (json.data || []) as CandleDataDTO[];

    return data.map(d => ({
        candle: {
            time:   d.time as UTCTimestamp,
            open:   d.open,
            high:   d.high,
            low:    d.low,
            close:  d.close
        },
        volume: {
            time:   d.time as UTCTimestamp,
            value:  d.volume,
            color:  d.close >= d.open ? UP_COLOR : DOWN_COLOR
        }
    })).sort((a, b) => a.candle.time - b.candle.time);
};