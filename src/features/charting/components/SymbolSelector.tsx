import { useNavigate, useParams } from "react-router-dom";
import { SYMBOLS } from "../constants/chart";

export const SymbolSelector = () => {
    const { symbol } = useParams<{ symbol: string }>();
    const navigate = useNavigate();

    return (
        <div style={{ display: 'flex', gap: '5px' }}>
            {SYMBOLS.map((s) => (
                <button
                    key={s}
                    onClick={() => navigate(`/chart/${s}`)} // URL 변경 -> 페이지 리로드 없이 데이터만 교체됨
                    style={{
                        fontWeight: symbol === s ? 'bold' : 'normal',
                        backgroundColor: symbol === s ? '#2196F3' : '#334158',
                    // ... 스타일
                    }}
                >
                    {s}
                </button>
            ))}
        </div>
    );
};