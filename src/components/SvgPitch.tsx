import Svg, { Circle, Line, Rect } from 'react-native-svg';

import { PITCH_LENGTH_M, PITCH_WIDTH_M, type PitchBackground } from '../scene/schema';
import { colors } from '../ui/theme';

/**
 * Decorative pitch background. The coordinate space is ALWAYS 70x100 virtual
 * meters regardless of background choice — backgrounds only change the art.
 */
export function SvgPitch({ pitch, widthPx }: { pitch: PitchBackground; widthPx: number }) {
  const heightPx = (widthPx * PITCH_LENGTH_M) / PITCH_WIDTH_M;
  const s = widthPx / PITCH_WIDTH_M; // px per meter

  const line = (x1: number, y1: number, x2: number, y2: number, dashed = false, key?: string) => (
    <Line
      key={key ?? `${x1}-${y1}-${x2}-${y2}`}
      x1={x1 * s}
      y1={y1 * s}
      x2={x2 * s}
      y2={y2 * s}
      stroke={colors.pitchLine}
      strokeWidth={1.5}
      strokeDasharray={dashed ? '6 6' : undefined}
      opacity={0.9}
    />
  );

  const gridLines = () => {
    const lines = [];
    for (let y = 10; y < PITCH_LENGTH_M; y += 10) {
      lines.push(line(0, y, PITCH_WIDTH_M, y, true, `gy-${y}`));
    }
    for (let x = 10; x < PITCH_WIDTH_M; x += 10) {
      lines.push(line(x, 0, x, PITCH_LENGTH_M, true, `gx-${x}`));
    }
    return lines;
  };

  return (
    <Svg width={widthPx} height={heightPx} testID="pitch-svg">
      <Rect x={0} y={0} width={widthPx} height={heightPx} fill={colors.pitchGrass} rx={8} />
      {pitch === 'blank-grid' && gridLines()}
      {pitch === 'full' && (
        <>
          {line(0, 2, PITCH_WIDTH_M, 2) /* try line */}
          {line(0, 24, PITCH_WIDTH_M, 24) /* 22m */}
          {line(0, 40, PITCH_WIDTH_M, 40, true) /* 10m */}
          {line(0, 50, PITCH_WIDTH_M, 50) /* halfway */}
          {line(0, 60, PITCH_WIDTH_M, 60, true) /* 10m */}
          {line(0, 76, PITCH_WIDTH_M, 76) /* 22m */}
          {line(0, 98, PITCH_WIDTH_M, 98) /* try line */}
          <Circle cx={(PITCH_WIDTH_M / 2) * s} cy={50 * s} r={3} fill={colors.pitchLine} />
        </>
      )}
      {pitch === 'half' && (
        <>
          {line(0, 4, PITCH_WIDTH_M, 4) /* halfway */}
          {line(0, 40, PITCH_WIDTH_M, 40, true) /* 10m */}
          {line(0, 66, PITCH_WIDTH_M, 66) /* 22m */}
          {line(0, 96, PITCH_WIDTH_M, 96) /* try line */}
        </>
      )}
      {pitch === 'quarter' && (
        <>
          {line(0, 30, PITCH_WIDTH_M, 30) /* 22m */}
          {line(0, 92, PITCH_WIDTH_M, 92) /* try line */}
          {line(17.5, 0, 17.5, PITCH_LENGTH_M, true)}
          {line(52.5, 0, 52.5, PITCH_LENGTH_M, true)}
        </>
      )}
    </Svg>
  );
}
