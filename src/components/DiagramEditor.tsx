import { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS } from 'react-native-reanimated';
import Svg, { Polyline } from 'react-native-svg';

import {
  addElement,
  canUndo,
  commit,
  createHistory,
  moveElement,
  newElementId,
  pxToMeters,
  removeElement,
  scaleForCanvas,
  setPitch,
  undo,
  type SceneHistory,
} from '../scene/logic';
import { pathLength, simplifyPath, smoothPath } from '../scene/playback';
import {
  PASS_TYPE_ORDER,
  PITCH_BACKGROUNDS,
  RUN_SPEED_ORDER,
  type PlayerElement,
  type Run,
  type SceneElement,
  type SceneV3,
  type Team,
  type Vec2,
} from '../scene/schema';
import { Button, Chip, ChipRow, Muted, SectionLabel } from '../ui/core';
import { colors, font, radius, spacing } from '../ui/theme';
import { canvasHeightFor } from './DiagramCanvas';
import { DraggableToken, type EditorMode } from './DraggableToken';
import { PlaybackView } from './PlaybackView';
import { SvgPitch } from './SvgPitch';
import { TOKEN_SIZE } from './TokenView';

const PLAYER_HIT_RADIUS_M = 4;
const MIN_RUN_LENGTH_M = 2;
const RELEASE_STEPS = [0.25, 0.5, 0.75];

const TEAM_RUN_COLORS: Record<Team, string> = {
  attack: '#fca5a5',
  defence: '#93c5fd',
  neutral: '#cbd5e1',
};

function nextPlayerLabel(scene: SceneV3, team: Team): string {
  const count = scene.elements.filter((el) => el.type === 'player' && el.team === team).length;
  return String(count + 1);
}

function playerAt(scene: SceneV3, meters: Vec2): PlayerElement | null {
  let best: PlayerElement | null = null;
  let bestDist = PLAYER_HIT_RADIUS_M;
  for (const el of scene.elements) {
    if (el.type !== 'player') continue;
    const dist = Math.hypot(el.position.x - meters.x, el.position.y - meters.y);
    if (dist <= bestDist) {
      best = el;
      bestDist = dist;
    }
  }
  return best;
}

/** Who holds the ball at the END of the current pass chain. */
function chainEndCarrier(scene: SceneV3): string | null {
  if (scene.passes.length > 0) return scene.passes[scene.passes.length - 1].toId;
  return scene.carrierId;
}

function playerLabel(scene: SceneV3, id: string): string {
  const el = scene.elements.find((e) => e.id === id);
  return el && el.type === 'player' && el.label ? `#${el.label}` : '•';
}

export function DiagramEditor({
  initialScene,
  onSave,
  isSaving,
}: {
  initialScene: SceneV3;
  onSave: (scene: SceneV3) => void;
  isSaving: boolean;
}) {
  const [history, setHistory] = useState<SceneHistory>(() => createHistory(initialScene));
  const [mode, setMode] = useState<EditorMode>('move');
  const [isPlayMode, setIsPlayMode] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isPickingReceiver, setIsPickingReceiver] = useState(false);
  const [drawPreview, setDrawPreview] = useState<Vec2[]>([]);

  const { width: windowWidth } = useWindowDimensions();
  const canvasWidth = Math.max(200, Math.min(windowWidth - 32, 560));
  const scale = scaleForCanvas(canvasWidth);
  const heightPx = canvasHeightFor(canvasWidth);
  const tokenSize = Math.max(20, Math.min(TOKEN_SIZE + 6, canvasWidth / 11));

  const scene = history.present;
  const drawSamples = useRef<Vec2[]>([]);
  const drawTarget = useRef<string | null>(null);

  const apply = (next: SceneV3) => setHistory((h) => commit(h, next));

  // ---- palette ----
  const addPlayer = (team: Team) =>
    apply(
      addElement(scene, {
        id: newElementId(),
        type: 'player',
        team,
        label: nextPlayerLabel(scene, team),
        position: { x: 35, y: 50 },
      }),
    );
  const addCone = () =>
    apply(addElement(scene, { id: newElementId(), type: 'cone', position: { x: 35, y: 46 } }));
  const cyclePitch = () => {
    const idx = PITCH_BACKGROUNDS.indexOf(scene.pitch);
    apply(setPitch(scene, PITCH_BACKGROUNDS[(idx + 1) % PITCH_BACKGROUNDS.length]));
  };

  // ---- animate-mode helpers ----
  const selectedRun = scene.runs.find((r) => r.elementId === selectedId);
  const carrierAtEnd = chainEndCarrier(scene);

  const handleAnimateTap = (pxX: number, pxY: number) => {
    const meters = pxToMeters({ x: pxX, y: pxY }, scale);
    const player = playerAt(scene, meters);
    if (!player) {
      setSelectedId(null);
      setIsPickingReceiver(false);
      return;
    }
    if (isPickingReceiver && carrierAtEnd && player.id !== carrierAtEnd) {
      apply({
        ...scene,
        passes: [
          ...scene.passes,
          {
            id: newElementId(),
            fromId: carrierAtEnd,
            toId: player.id,
            releaseFrac: 0.5,
            type: 'spin',
          },
        ],
      });
      setIsPickingReceiver(false);
      return;
    }
    setSelectedId(player.id);
  };

  const startDraw = (pxX: number, pxY: number) => {
    const meters = pxToMeters({ x: pxX, y: pxY }, scale);
    const player = playerAt(scene, meters);
    drawTarget.current = player?.id ?? null;
    drawSamples.current = player ? [player.position] : [];
    if (player) setSelectedId(player.id);
  };

  const pushDrawSample = (pxX: number, pxY: number) => {
    if (!drawTarget.current) return;
    drawSamples.current.push(pxToMeters({ x: pxX, y: pxY }, scale));
    if (drawSamples.current.length % 3 === 0) setDrawPreview([...drawSamples.current]);
  };

  const finishDraw = () => {
    const target = drawTarget.current;
    const raw = drawSamples.current;
    drawTarget.current = null;
    drawSamples.current = [];
    setDrawPreview([]);
    if (!target || raw.length < 2) return;
    const points = smoothPath(simplifyPath(raw, 0.9), 1);
    if (points.length < 2 || pathLength(points) < MIN_RUN_LENGTH_M) return;
    const run: Run = { elementId: target, points, speed: 'run' };
    apply({
      ...scene,
      runs: [...scene.runs.filter((r) => r.elementId !== target), run],
    });
    setSelectedId(target);
  };

  const setRunSpeed = (speed: Run['speed']) => {
    if (!selectedId) return;
    apply({
      ...scene,
      runs: scene.runs.map((r) => (r.elementId === selectedId ? { ...r, speed } : r)),
    });
  };

  const removeRun = () => {
    if (!selectedId) return;
    apply({ ...scene, runs: scene.runs.filter((r) => r.elementId !== selectedId) });
  };

  const giveBall = () => {
    if (!selectedId) return;
    // changing the kickoff carrier invalidates the pass chain
    apply({ ...scene, carrierId: selectedId, passes: [] });
  };

  const cyclePassType = (passId: string) => {
    apply({
      ...scene,
      passes: scene.passes.map((p) =>
        p.id === passId
          ? { ...p, type: PASS_TYPE_ORDER[(PASS_TYPE_ORDER.indexOf(p.type) + 1) % PASS_TYPE_ORDER.length] }
          : p,
      ),
    });
  };

  const cycleRelease = (passId: string) => {
    apply({
      ...scene,
      passes: scene.passes.map((p) => {
        if (p.id !== passId) return p;
        const idx = RELEASE_STEPS.indexOf(p.releaseFrac);
        return { ...p, releaseFrac: RELEASE_STEPS[(idx + 1) % RELEASE_STEPS.length] };
      }),
    });
  };

  const deletePassFrom = (index: number) => {
    apply({ ...scene, passes: scene.passes.slice(0, index) });
  };

  // ---- canvas gestures (arrow drawing + animate mode) ----
  const isArrowMode = mode === 'arrow-run' || mode === 'arrow-pass';
  const isAnimateMode = mode === 'animate';

  const arrowSamples = useRef<Vec2[]>([]);
  const pushArrowSample = (pxX: number, pxY: number) => {
    const m = pxToMeters({ x: pxX, y: pxY }, scale);
    arrowSamples.current.push(m);
    if (arrowSamples.current.length % 3 === 0) setDrawPreview([...arrowSamples.current]);
  };
  const finishArrow = () => {
    const raw = arrowSamples.current;
    arrowSamples.current = [];
    setDrawPreview([]);
    if (raw.length < 2) return;
    const points = simplifyPath(raw, 1.2);
    if (points.length < 2) return;
    apply(
      addElement(scene, {
        id: newElementId(),
        type: 'arrow',
        style: mode === 'arrow-pass' ? 'pass' : 'run',
        position: points[0],
        points,
      }),
    );
    setMode('move');
  };

  const canvasPan = Gesture.Pan()
    .enabled(isArrowMode || isAnimateMode)
    .onStart((e) => {
      if (isAnimateMode) {
        runOnJS(startDraw)(e.x, e.y);
      } else {
        runOnJS(pushArrowSample)(e.x, e.y);
      }
    })
    .onUpdate((e) => {
      if (isAnimateMode) {
        runOnJS(pushDrawSample)(e.x, e.y);
      } else {
        runOnJS(pushArrowSample)(e.x, e.y);
      }
    })
    .onEnd(() => {
      if (isAnimateMode) {
        runOnJS(finishDraw)();
      } else {
        runOnJS(finishArrow)();
      }
    });

  const canvasTap = Gesture.Tap()
    .enabled(isAnimateMode)
    .onEnd((e) => {
      runOnJS(handleAnimateTap)(e.x, e.y);
    });

  const canvasGesture = Gesture.Exclusive(canvasPan, canvasTap);

  const arrows = scene.elements.filter((el) => el.type === 'arrow');
  const tokens = scene.elements.filter((el) => el.type !== 'arrow');

  if (isPlayMode) {
    return (
      <View>
        <PlaybackView scene={scene} widthPx={canvasWidth} />
        <Button
          label="Back to editing"
          variant="secondary"
          onPress={() => setIsPlayMode(false)}
          testID="exit-play-mode"
        />
      </View>
    );
  }

  return (
    <View testID="diagram-editor">
      {/* palette */}
      <ChipRow>
        <Chip label="+ Attacker" onPress={() => addPlayer('attack')} testID="add-attacker" />
        <Chip label="+ Defender" onPress={() => addPlayer('defence')} testID="add-defender" />
        <Chip label="+ Neutral" onPress={() => addPlayer('neutral')} testID="add-neutral" />
        <Chip label="+ Cone" onPress={addCone} testID="add-cone" />
      </ChipRow>
      <ChipRow>
        <Chip
          label="🎬 Animate"
          selected={isAnimateMode}
          onPress={() => {
            setMode(isAnimateMode ? 'move' : 'animate');
            setIsPickingReceiver(false);
          }}
          testID="mode-animate"
        />
        <Chip
          label="Run arrow"
          selected={mode === 'arrow-run'}
          onPress={() => setMode(mode === 'arrow-run' ? 'move' : 'arrow-run')}
          testID="mode-arrow-run"
        />
        <Chip
          label="Pass arrow"
          selected={mode === 'arrow-pass'}
          onPress={() => setMode(mode === 'arrow-pass' ? 'move' : 'arrow-pass')}
          testID="mode-arrow-pass"
        />
        <Chip label={`Pitch: ${scene.pitch}`} onPress={cyclePitch} testID="cycle-pitch" />
        <Chip
          label="Undo"
          onPress={() => setHistory((h) => (canUndo(h) ? undo(h) : h))}
          testID="undo"
        />
      </ChipRow>

      {isAnimateMode ? (
        <Muted>
          {isPickingReceiver
            ? 'Tap the player who catches the pass.'
            : 'Drag FROM a player to draw their run. Tap a player to select them.'}
        </Muted>
      ) : isArrowMode ? (
        <Muted>Drag on the pitch to draw the arrow (release to place it).</Muted>
      ) : (
        <Muted>Drag pieces to place them. Long-press a piece to delete it.</Muted>
      )}

      {/* canvas */}
      <View style={styles.canvasWrap} testID="editor-canvas">
        <GestureDetector gesture={canvasGesture}>
          <Animated.View style={{ width: canvasWidth, height: heightPx }}>
            <SvgPitch pitch={scene.pitch} widthPx={canvasWidth} />
            <Svg width={canvasWidth} height={heightPx} style={StyleSheet.absoluteFill}>
              {/* static annotation arrows */}
              {arrows.map((arrow) =>
                arrow.type === 'arrow' ? (
                  <Polyline
                    key={arrow.id}
                    points={arrow.points.map((p) => `${p.x * scale},${p.y * scale}`).join(' ')}
                    fill="none"
                    stroke={arrow.style === 'pass' ? '#fde68a' : '#ffffff'}
                    strokeWidth={2.5}
                    strokeDasharray={arrow.style === 'pass' ? '7 6' : undefined}
                    strokeLinecap="round"
                  />
                ) : null,
              )}
              {/* run lines */}
              {scene.runs.map((run) => {
                const owner = scene.elements.find((e) => e.id === run.elementId);
                const team: Team = owner?.type === 'player' ? owner.team : 'neutral';
                const isSelected = run.elementId === selectedId;
                return (
                  <Polyline
                    key={`run-${run.elementId}`}
                    points={run.points.map((p) => `${p.x * scale},${p.y * scale}`).join(' ')}
                    fill="none"
                    stroke={TEAM_RUN_COLORS[team]}
                    strokeWidth={isSelected ? 4 : 2.5}
                    strokeDasharray="2 6"
                    strokeLinecap="round"
                  />
                );
              })}
              {drawPreview.length >= 2 && (
                <Polyline
                  points={drawPreview.map((p) => `${p.x * scale},${p.y * scale}`).join(' ')}
                  fill="none"
                  stroke="#fde68a"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                />
              )}
            </Svg>
            {tokens.map((el: SceneElement) => (
              <DraggableToken
                key={el.id}
                element={el}
                scale={scale}
                size={tokenSize}
                mode={mode}
                selected={el.id === selectedId}
                onCommitMove={(id, m) => apply(moveElement(scene, id, m))}
                onDelete={(id) => apply(removeElement(scene, id))}
              />
            ))}
            {/* ball marker on the kickoff carrier */}
            {scene.carrierId &&
              (() => {
                const carrier = scene.elements.find((e) => e.id === scene.carrierId);
                if (!carrier) return null;
                return (
                  <View
                    pointerEvents="none"
                    style={{
                      position: 'absolute',
                      left: carrier.position.x * scale + tokenSize * 0.25,
                      top: carrier.position.y * scale - tokenSize * 0.7,
                    }}
                  >
                    <Text style={{ fontSize: tokenSize * 0.55 }}>🏉</Text>
                  </View>
                );
              })()}
          </Animated.View>
        </GestureDetector>
      </View>

      {/* arrows list for deletion */}
      {arrows.length > 0 && (
        <ChipRow>
          {arrows.map((arrow, idx) => (
            <Chip
              key={arrow.id}
              label={`✕ ${arrow.type === 'arrow' ? arrow.style : ''} arrow ${idx + 1}`}
              onPress={() => apply(removeElement(scene, arrow.id))}
              testID={`delete-arrow-${idx}`}
            />
          ))}
        </ChipRow>
      )}

      {/* animate-mode controls */}
      {isAnimateMode && (
        <>
          <SectionLabel>Animation</SectionLabel>
          {selectedId ? (
            <>
              <Muted>Selected: {playerLabel(scene, selectedId)}</Muted>
              <ChipRow>
                <Chip
                  label={scene.carrierId === selectedId ? '🏉 Has ball' : '🏉 Give ball'}
                  selected={scene.carrierId === selectedId}
                  onPress={giveBall}
                  testID="give-ball"
                />
                {selectedRun && <Chip label="✕ Remove run" onPress={removeRun} testID="remove-run" />}
              </ChipRow>
              {selectedRun && (
                <ChipRow>
                  {RUN_SPEED_ORDER.map((speed) => (
                    <Chip
                      key={speed}
                      label={speed}
                      selected={selectedRun.speed === speed}
                      onPress={() => setRunSpeed(speed)}
                      testID={`speed-${speed}`}
                    />
                  ))}
                </ChipRow>
              )}
            </>
          ) : (
            <Muted>No player selected.</Muted>
          )}

          <ChipRow>
            <Chip
              label={isPickingReceiver ? 'Tap the receiver…' : '＋ Pass'}
              selected={isPickingReceiver}
              onPress={() => {
                if (!carrierAtEnd) return;
                setIsPickingReceiver(!isPickingReceiver);
              }}
              testID="add-pass"
            />
            {!scene.carrierId && <Muted>Give someone the ball first.</Muted>}
          </ChipRow>

          {scene.passes.map((pass, idx) => (
            <View key={pass.id} style={styles.passRow} testID={`pass-row-${idx}`}>
              <Text style={styles.passLabel}>
                {idx + 1}. {playerLabel(scene, pass.fromId)} → {playerLabel(scene, pass.toId)}
              </Text>
              <Pressable onPress={() => cyclePassType(pass.id)} style={styles.passChip}>
                <Text style={styles.passChipText}>{pass.type}</Text>
              </Pressable>
              <Pressable onPress={() => cycleRelease(pass.id)} style={styles.passChip}>
                <Text style={styles.passChipText}>
                  {pass.releaseFrac === 0.25 ? 'early' : pass.releaseFrac === 0.75 ? 'late' : 'mid'}
                </Text>
              </Pressable>
              <Pressable onPress={() => deletePassFrom(idx)} hitSlop={8}>
                <Text style={styles.deletePass}>✕</Text>
              </Pressable>
            </View>
          ))}
        </>
      )}

      <View style={styles.actionRow}>
        <Button
          label="▶ Play"
          variant="secondary"
          onPress={() => setIsPlayMode(true)}
          disabled={scene.runs.length === 0 && scene.passes.length === 0}
          testID="enter-play-mode"
        />
        <Button
          label={isSaving ? 'Saving…' : 'Save diagram'}
          onPress={() => onSave(scene)}
          loading={isSaving}
          testID="save-diagram"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  canvasWrap: {
    marginVertical: spacing.md,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  passRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  passLabel: { flex: 1, fontWeight: '600', color: colors.text, fontSize: font.sm },
  passChip: {
    backgroundColor: colors.chipBg,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
  },
  passChipText: { fontSize: font.xs, fontWeight: '700', color: colors.text },
  deletePass: { color: colors.danger, fontSize: 18, fontWeight: '700', padding: spacing.sm },
  actionRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.md },
});
