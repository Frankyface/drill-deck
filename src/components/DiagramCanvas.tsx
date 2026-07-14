import { View } from 'react-native';
import Svg, { Polygon, Polyline } from 'react-native-svg';

import { scaleForCanvas } from '../scene/logic';
import {
  PITCH_LENGTH_M,
  PITCH_WIDTH_M,
  type ArrowElement,
  type SceneV4,
} from '../scene/schema';
import { colors } from '../ui/theme';
import { SvgPitch } from './SvgPitch';
import { TOKEN_SIZE, TokenView } from './TokenView';

export function canvasHeightFor(widthPx: number): number {
  return (widthPx * PITCH_LENGTH_M) / PITCH_WIDTH_M;
}

function ArrowShape({ arrow, scale }: { arrow: ArrowElement; scale: number }) {
  const pts = arrow.points.map((p) => ({ x: p.x * scale, y: p.y * scale }));
  const pointsAttr = pts.map((p) => `${p.x},${p.y}`).join(' ');

  // manual arrowhead on the final segment (more portable than SVG markers)
  const last = pts[pts.length - 1];
  const prev = pts[pts.length - 2];
  const angle = Math.atan2(last.y - prev.y, last.x - prev.x);
  const headLen = 10;
  const spread = Math.PI / 7;
  const head = [
    last,
    {
      x: last.x - headLen * Math.cos(angle - spread),
      y: last.y - headLen * Math.sin(angle - spread),
    },
    {
      x: last.x - headLen * Math.cos(angle + spread),
      y: last.y - headLen * Math.sin(angle + spread),
    },
  ]
    .map((p) => `${p.x},${p.y}`)
    .join(' ');

  const stroke = arrow.style === 'pass' ? '#fde68a' : '#ffffff';
  return (
    <>
      <Polyline
        points={pointsAttr}
        fill="none"
        stroke={stroke}
        strokeWidth={2.5}
        strokeDasharray={arrow.style === 'pass' ? '7 6' : undefined}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Polygon points={head} fill={stroke} />
    </>
  );
}

/**
 * Read-only scene renderer — library thumbnails, drill detail previews, and
 * the base layer of the editor. Tokens are real Views (inspectable on web).
 */
export function DiagramCanvas({
  scene,
  widthPx,
  tokenSize,
}: {
  scene: SceneV4;
  widthPx: number;
  tokenSize?: number;
}) {
  const scale = scaleForCanvas(widthPx);
  const heightPx = canvasHeightFor(widthPx);
  const size = tokenSize ?? Math.max(12, Math.min(TOKEN_SIZE, widthPx / 12));

  const arrows = scene.elements.filter((el): el is ArrowElement => el.type === 'arrow');
  const tokens = scene.elements.filter((el) => el.type !== 'arrow');

  return (
    <View
      style={{ width: widthPx, height: heightPx, borderRadius: 8, overflow: 'hidden' }}
      pointerEvents="none"
      testID="diagram-canvas"
    >
      <SvgPitch pitch={scene.pitch} widthPx={widthPx} />
      <Svg
        width={widthPx}
        height={heightPx}
        style={{ position: 'absolute', top: 0, left: 0 }}
      >
        {arrows.map((arrow) => (
          <ArrowShape key={arrow.id} arrow={arrow} scale={scale} />
        ))}
        {scene.runs.map((run) => {
          const owner = scene.elements.find((e) => e.id === run.elementId);
          const team = owner?.type === 'player' ? owner.team : 'neutral';
          const stroke =
            team === 'attack' ? '#fca5a5' : team === 'defence' ? '#93c5fd' : '#cbd5e1';
          return (
            <Polyline
              key={`run-${run.elementId}`}
              points={run.points.map((p) => `${p.x * scale},${p.y * scale}`).join(' ')}
              fill="none"
              stroke={stroke}
              strokeWidth={2}
              strokeDasharray="2 5"
              strokeLinecap="round"
            />
          );
        })}
      </Svg>
      {tokens.map((el) => {
        // A held ball rides its holder's position; everything else uses its own.
        const holder =
          el.type === 'ball' && el.heldBy
            ? scene.elements.find((e) => e.id === el.heldBy)
            : undefined;
        const cx = holder ? holder.position.x * scale + size * 0.28 : el.position.x * scale;
        const cy = holder ? holder.position.y * scale - size * 0.5 : el.position.y * scale;
        return (
          <View
            key={el.id}
            style={{ position: 'absolute', left: cx - size / 2, top: cy - size / 2 }}
          >
            <TokenView element={el} size={size} />
          </View>
        );
      })}
      {scene.runs.length > 0 || scene.passes.length > 0 ? (
        <View
          style={{
            position: 'absolute',
            right: 6,
            top: 6,
            backgroundColor: 'rgba(0,0,0,0.55)',
            borderRadius: 6,
            paddingHorizontal: 6,
            paddingVertical: 2,
          }}
        >
          <View
            style={{
              width: 0,
              height: 0,
              borderTopWidth: 6,
              borderBottomWidth: 6,
              borderLeftWidth: 10,
              borderTopColor: 'transparent',
              borderBottomColor: 'transparent',
              borderLeftColor: colors.onPrimary,
            }}
          />
        </View>
      ) : null}
    </View>
  );
}
