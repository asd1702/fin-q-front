// src/App.tsx (수정)
import { Routes, Route, Navigate } from 'react-router-dom';
import { ChartPage } from './features/charting/pages/ChartPage';

// 사용자가 처음 들어왔을 때 보여줄 기본 심볼
const DEFAULT_SYMBOL = 'BTC/USD'; // (또는 'SPY' 등)

function App() {
  return (
    <Routes>
      {/* 1. :symbol 자리에 'SPY', 'QQQ' 등이 동적으로 들어옵니다. */}
      <Route path="/chart/:symbol" element={<ChartPage />} />

      {/* 2. 사용자가 '/' 로 그냥 접속하면 기본 심볼 페이지로 리다이렉트합니다. */}
      <Route 
        path="/" 
        element={<Navigate to={`/chart/${DEFAULT_SYMBOL}`} replace />} 
      />
    </Routes>
  );
}

export default App;