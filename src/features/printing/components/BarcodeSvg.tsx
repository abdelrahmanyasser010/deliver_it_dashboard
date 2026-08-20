import { useMemo } from 'react';

// Code128 pattern dictionary for 107 symbols (0 to 106)
// Each pattern is 11 modules wide (except STOP symbol 106 which is 13 modules wide).
const CODE128_PATTERNS: readonly string[] = [
  "212222", "222122", "222221", "121223", "121322", "131222", "122213", "122312", "132212", "221213",
  "221312", "231212", "112232", "122132", "122231", "113222", "123122", "123221", "223211", "221132",
  "221231", "213212", "223112", "312131", "311222", "321122", "321221", "312212", "322112", "322211",
  "212123", "212321", "232121", "111323", "131123", "131321", "112313", "132113", "132311", "211313",
  "231113", "231311", "112133", "112331", "132131", "113123", "113321", "133121", "313121", "211331",
  "231131", "213113", "213311", "213131", "311123", "311321", "331121", "312113", "312311", "332111",
  "314111", "221411", "431111", "111224", "111422", "121124", "121421", "141122", "141221", "112214",
  "112412", "122114", "122411", "142112", "142211", "241211", "221114", "413111", "241112", "134111",
  "111242", "121142", "121241", "114212", "124112", "124211", "411212", "421112", "421211", "212141",
  "214121", "412121", "111143", "111341", "131141", "114113", "114311", "411113", "411311", "113141",
  "114131", "311141", "411131", "211412", "211214", "211232", "2331112"
];

const START_CODE_B = 104;
const STOP_CODE = 106;

function encodeCode128B(text: string): string | null {
  const codes: number[] = [START_CODE_B];
  let checksum = START_CODE_B;

  for (let i = 0; i < text.length; i++) {
    const charCode = text.charCodeAt(i);
    // ASCII 32 to 126 map directly to Code 128B symbols 0 to 94
    if (charCode < 32 || charCode > 126) {
      // Fallback for non-ASCII: map to wildcard char 63 ('?')
      const val = 31; // char code '?' is 63, symbol is 63-32=31
      codes.push(val);
      checksum += val * (i + 1);
    } else {
      const val = charCode - 32;
      codes.push(val);
      checksum += val * (i + 1);
    }
  }

  const checksumSymbol = checksum % 103;
  codes.push(checksumSymbol);
  codes.push(STOP_CODE);

  return codes.map(c => CODE128_PATTERNS[c]).join('');
}

interface BarcodeSvgProps {
  value: string;
  height?: number;
  barWidth?: number;
  displayValue?: boolean;
  className?: string;
}

export function BarcodeSvg({
  value,
  height = 55,
  barWidth = 1.8,
  displayValue = true,
  className = '',
}: BarcodeSvgProps) {
  const { rects, totalWidth } = useMemo(() => {
    const pattern = encodeCode128B(value ?? '') ?? '';
    let x = 0;
    const resultRects: Array<{ x: number; width: number }> = [];

    for (let i = 0; i < pattern.length; i++) {
      const width = parseInt(pattern[i], 10) * barWidth;
      // Even indices are bars (black), odd indices are spaces (white)
      if (i % 2 === 0) {
        resultRects.push({ x, width });
      }
      x += width;
    }

    return { rects: resultRects, totalWidth: x };
  }, [value, barWidth]);

  if (!value) return null;

  return (
    <div className={`barcode-svg-wrapper ${className}`} style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center' }}>
      <svg
        width={totalWidth}
        height={height}
        viewBox={`0 0 ${totalWidth} ${height}`}
        style={{ display: 'block', background: '#ffffff' }}
      >
        {rects.map((rect, idx) => (
          <rect key={idx} x={rect.x} y={0} width={rect.width} height={height} fill="#000000" />
        ))}
      </svg>
      {displayValue && (
        <span style={{ fontSize: '11px', fontFamily: 'monospace', fontWeight: 'bold', color: '#000', marginTop: '2px', letterSpacing: '1px' }}>
          {value}
        </span>
      )}
    </div>
  );
}
