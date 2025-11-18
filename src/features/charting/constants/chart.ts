export const TIMEFRAME_MINUTES: Record<string, number> = {
 '1m': 1,
 '5m': 5,
 '15m': 15,
 '1h': 60,
 '4h': 240,
};

export const TIMEFRAMES = Object.keys(TIMEFRAME_MINUTES);
export const SYMBOLS = ['BTC/USD', 'SPY', 'QQQ', 'DIA'];

export const CHART_HEIGHT = 300;
export const VOLUME_CHART_HEIGHT = 100;
export const UP_COLOR = '#26a69a';
export const DOWN_COLOR = '#ef5350';