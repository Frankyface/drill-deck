import { useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS } from 'react-native-reanimated';
import Svg, { Circle, Polyline } from 'react-native-svg';

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
import {
  buildDrillTimeline,
  pathLength,
  positionOnRun,
  runDurationMs,
  simplifyPath,
  smoothPath,
} from '../scene/playback';
import {
  PASS_TYPE_ORDER,
  PITCH_BACKGROUNDS,
  RUN_SPEED_ORDER,
  type BallElement,
  type PlayerElement,
  type Run,
  type SceneElement,
  type SceneV4,
  type Team,
  type Trigger,
  type Vec2,
} from '../scene/schema';
import { Button, Chip, ChipRow, Muted, SectionLabel } from '../ui/core';
import { colors, font, radius, spacing } from '../ui/theme';
import { canvasHeightFor } from './DiagramCanvas';
import { DraggableToken, type EditorMode } from './DraggableToken';
import { PlaybackView } from './PlaybackView';
import { SvgPitch } from './SvgPitch';
import { TOKEN_SIZE, TokenView } from './TokenView';

const PLAYER_HIT_RADIUS_M = 4;
const BALL_HIT_RADIUS_M = 3;
const MIN_RUN_LENGTH_M = 2;
const RELEASE_STEPS = [0.25, 0.5, 0.75];
// Delay-trigger sub-cycle: entry is "wait 1s", then 2s → 3s → 0.5s → on-catch.
const DELAY_STEPS_MS = [1000, 2000, 3000, 500];
// A held ball renders (and hit-tests) up-and-right of its holder so it stays
// distinct from the player token underneath it.
const HELD_BALL_OFFSET_M: Vec2 = { x: 1.6, y: -2.8 };

const TEAM_RUN_COLORS: Record<Team, string> = {
  attack: '#fca5a5',
  defence: '#93c5fd',
  neutral: '#cbd5e1',
};

/** What the next canvas tap will do: nothing special, or complete a pick. */
type PickMode = 'none' | 'pass' | 'give' | 'withPlayer';

function nextPlayerLabel(scene: SceneV4, team: Team): string {
  const count = scene.elements.filter((el) => el.type === 'player' && el.team === team).length;
  return String(count + 1);
}

function playerAt(scene: SceneV4, meters: Vec2): PlayerElement | null {
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

/** Where a ball sits in the editor: on its holder (with offset) if held, else its own spot. */
function editorBallPos(scene: SceneV4, ball: BallElement): Vec2 {
  if (ball.heldBy) {
    const holder = scene.elements.find((e) => e.id === ball.heldBy);
    if (holder) {
      return { x: holder.position.x + HELD_BALL_OFFSET_M.x, y: holder.position.y + HELD_BALL_OFFSET_M.y };
    }
  }
  return ball.position;
}

function nearestBall(scene: SceneV4, meters: Vec2): { ball: BallElement; dist: number } | null {
  let best: BallElement | null = null;
  let bestDist = BALL_HIT_RADIUS_M;
  for (const el of scene.elements) {
    if (el.type !== 'ball') continue;
    const p = editorBallPos(scene, el);
    const dist = Math.hypot(p.x - meters.x, p.y - meters.y);
    if (dist <= bestDist) {
      best = el;
      bestDist = dist;
    }
  }
  return best ? { ball: best, dist: bestDist } : null;
}

function playerLabel(scene: SceneV4, id: string): string {
  const el = scene.elements.find((e) => e.id === id);
  return el && el.type === 'player' && el.label ? `#${el.label}` : '•';
}

function ballIndex(scene: SceneV4, id: string): number {
  return scene.elements.filter((e) => e.type === 'ball').findIndex((e) => e.id === id) + 1;
}

function releaseLabel(frac: number): string {
  return frac === 0.25 ? 'early' : frac === 0.75 ? 'late' : 'mid';
}

export function DiagramEditor({
  initialScene,
  onSave,
  isSaving,
}: {
  initialScene: SceneV4;
  onSave: (scene: SceneV4) => void;
  isSaving: boolean;
}) {
  const [history, setHistory] = useState<SceneHistory>(() => createHistory(initialScene));
  const [mode, setMode] = useState<EditorMode>('move');
  const [isPlayMode, setIsPlayMode] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pickMode, setPickMode] = useState<PickMode>('none');
  const [pickBallId, setPickBallId] = useState<string | null>(null);
  const [drawPreview, setDrawPreview] = useState<Vec2[]>([]);

  const { width: windowWidth } = useWindowDimensions();
  const canvasWidth = Math.max(200, Math.min(windowWidth - 32, 560));
  const scale = scaleForCanvas(canvasWidth);
  const heightPx = canvasHeightFor(canvasWidth);
  const tokenSize = Math.max(20, Math.min(TOKEN_SIZE + 6, canvasWidth / 11));

  const scene = history.present;
  const timeline = useMemo(() => buildDrillTimeline(scene), [scene]);
  const drawSamples = useRef<Vec2[]>([]);
  const drawTarget = useRef<string | null>(null);

  const apply = (next: SceneV4) => setHistory((h) => commit(h, next));

  const clearPick = () => {
    setPickMode('none');
    setPickBallId(null);
  };

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
  const addBall = () =>
    apply(
      addElement(scene, { id: newElementId(), type: 'ball', position: { x: 35, y: 54 }, heldBy: null }),
    );
  const cyclePitch = () => {
    const idx = PITCH_BACKGROUNDS.indexOf(scene.pitch);
    apply(setPitch(scene, PITCH_BACKGROUNDS[(idx + 1) % PITCH_BACKGROUNDS.length]));
  };

  // ---- animate-mode selection state ----
  const selectedEl = selectedId ? scene.elements.find((e) => e.id === selectedId) : undefined;
  const selectedRun = scene.runs.find((r) => r.elementId === selectedId);
  const isBallSelected = selectedEl?.type === 'ball';
  const isPlayerSelected = selectedEl?.type === 'player';
  const ballElements = scene.elements.filter((el): el is BallElement => el.type === 'ball');

  /** Who holds a given ball at the end of its resolved pass chain (incl. pickups). */
  const chainEndHolder = (ballId: string): string | null => {
    const seq = timeline.ballTimelines[ballId]?.carrierSequence;
    if (!seq || seq.length === 0) return null;
    return seq[seq.length - 1].carrierId;
  };

  // The ball the selected player could pass: the one whose chain ends in their hands.
  const passBall = isPlayerSelected
    ? ballElements.find((b) => chainEndHolder(b.id) === selectedId)
    : undefined;

  // ---- animate-mode mutations ----
  const addPass = (ballId: string, fromId: string, toId: string) => {
    apply({
      ...scene,
      passes: [
        ...scene.passes,
        { id: newElementId(), ballId, fromId, toId, releaseFrac: 0.5, type: 'spin' },
      ],
    });
  };

  const giveBallTo = (ballId: string, playerId: string) => {
    apply({
      ...scene,
      elements: scene.elements.map((el) =>
        el.id === ballId && el.type === 'ball' ? { ...el, heldBy: playerId } : el,
      ),
    });
    setSelectedId(ballId);
  };

  const dropBall = () => {
    if (!selectedId || selectedEl?.type !== 'ball') return;
    const ball = selectedEl;
    const holder = ball.heldBy ? scene.elements.find((e) => e.id === ball.heldBy) : undefined;
    const position = holder ? holder.position : ball.position;
    apply({
      ...scene,
      elements: scene.elements.map((el) =>
        el.id === selectedId && el.type === 'ball' ? { ...el, heldBy: null, position } : el,
      ),
    });
  };

  const removeSelected = () => {
    if (!selectedId) return;
    apply(removeElement(scene, selectedId));
    setSelectedId(null);
    clearPick();
  };

  const setTrigger = (trigger: Trigger) => {
    if (!selectedId) return;
    apply({
      ...scene,
      runs: scene.runs.map((r) => (r.elementId === selectedId ? { ...r, trigger } : r)),
    });
  };

  const onTriggerChip = () => {
    if (!selectedId || !selectedRun) return;
    if (pickMode === 'withPlayer') {
      clearPick();
      setTrigger({ kind: 'start' });
      return;
    }
    const cur: Trigger = selectedRun.trigger ?? { kind: 'start' };
    switch (cur.kind) {
      case 'start':
        setTrigger({ kind: 'delay', ms: DELAY_STEPS_MS[0] });
        break;
      case 'delay': {
        const i = DELAY_STEPS_MS.indexOf(cur.ms);
        if (i === -1 || i === DELAY_STEPS_MS.length - 1) setTrigger({ kind: 'onCatch' });
        else setTrigger({ kind: 'delay', ms: DELAY_STEPS_MS[i + 1] });
        break;
      }
      case 'onCatch':
        setTrigger({ kind: 'afterPass' });
        break;
      case 'afterPass': {
        const hasTeammate = scene.elements.some((e) => e.type === 'player' && e.id !== selectedId);
        if (hasTeammate) setPickMode('withPlayer');
        else setTrigger({ kind: 'start' });
        break;
      }
      case 'withPlayer':
        setTrigger({ kind: 'start' });
        break;
    }
  };

  const triggerChipLabel = (): string => {
    if (pickMode === 'withPlayer') return '🤝 With… (tap a teammate)';
    const t: Trigger = selectedRun?.trigger ?? { kind: 'start' };
    switch (t.kind) {
      case 'start':
        return '▶ Go';
      case 'delay':
        return `⏱ Wait ${t.ms / 1000}s`;
      case 'onCatch':
        return '🫴 On catch';
      case 'afterPass':
        return '➡ After pass';
      case 'withPlayer':
        return `🤝 With ${playerLabel(scene, t.playerId)}`;
    }
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

  const deletePass = (passId: string, ballId: string) => {
    const idx = scene.passes.findIndex((p) => p.id === passId);
    // Drop this pass and any later passes OF THE SAME BALL (its chain breaks here);
    // other balls' chains are untouched.
    apply({ ...scene, passes: scene.passes.filter((p, i) => p.ballId !== ballId || i < idx) });
  };

  // ---- animate-mode tap handling (all JS-side; gestures only ship raw numbers) ----
  const handleAnimateTap = (pxX: number, pxY: number) => {
    const meters = pxToMeters({ x: pxX, y: pxY }, scale);
    const player = playerAt(scene, meters);

    if (pickMode === 'pass') {
      if (player && pickBallId) {
        const fromId = chainEndHolder(pickBallId);
        if (fromId && player.id !== fromId) addPass(pickBallId, fromId, player.id);
      }
      clearPick();
      return;
    }
    if (pickMode === 'give') {
      if (player && pickBallId) giveBallTo(pickBallId, player.id);
      clearPick();
      return;
    }
    if (pickMode === 'withPlayer') {
      if (player && selectedId && player.id !== selectedId) {
        setTrigger({ kind: 'withPlayer', playerId: player.id });
      } else {
        setTrigger({ kind: 'start' }); // cancelled — back to Go
      }
      clearPick();
      return;
    }

    // normal selection: nearest of the tapped player / ball
    const ballHit = nearestBall(scene, meters);
    const playerDist = player
      ? Math.hypot(player.position.x - meters.x, player.position.y - meters.y)
      : Infinity;
    let pickId: string | null = null;
    if (ballHit && ballHit.dist < playerDist) pickId = ballHit.ball.id;
    else if (player) pickId = player.id;
    else if (ballHit) pickId = ballHit.ball.id;
    setSelectedId(pickId);
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
    // Redrawing a run keeps the player's existing speed and departure trigger.
    const existing = scene.runs.find((r) => r.elementId === target);
    const run: Run = {
      elementId: target,
      points,
      speed: existing?.speed ?? 'run',
      ...(existing?.trigger ? { trigger: existing.trigger } : {}),
    };
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
  // Ground balls + players + cones drag/select on the canvas; held balls ride
  // their holder and render as a non-interactive overlay.
  const heldBalls = scene.elements.filter(
    (el): el is BallElement => el.type === 'ball' && !!el.heldBy,
  );
  const tokens = scene.elements.filter(
    (el) => el.type !== 'arrow' && !(el.type === 'ball' && el.heldBy),
  );

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
        <Chip label="+ Ball" onPress={addBall} testID="add-ball" />
      </ChipRow>
      <ChipRow>
        <Chip
          label="🎬 Animate"
          selected={isAnimateMode}
          onPress={() => {
            setMode(isAnimateMode ? 'move' : 'animate');
            clearPick();
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
          {pickMode === 'pass'
            ? 'Tap the player who catches the pass.'
            : pickMode === 'give'
              ? 'Tap the player to give the ball to.'
              : pickMode === 'withPlayer'
                ? 'Tap the teammate to follow.'
                : 'Drag from a player to draw a run. Tap a player or ball to select.'}
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
              {/* release-point rings on the passer's run line */}
              {scene.passes.map((pass) => {
                const run = scene.runs.find((r) => r.elementId === pass.fromId);
                if (!run) return null;
                const pt = positionOnRun(run, pass.releaseFrac * runDurationMs(run), 0);
                return (
                  <Circle
                    key={`release-${pass.id}`}
                    cx={pt.x * scale}
                    cy={pt.y * scale}
                    r={4.5}
                    fill="none"
                    stroke="#fde68a"
                    strokeWidth={2}
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
            {/* held balls ride their holder's position */}
            {heldBalls.map((ball) => {
              const holder = scene.elements.find((e) => e.id === ball.heldBy);
              if (!holder) return null;
              const cx = (holder.position.x + HELD_BALL_OFFSET_M.x) * scale;
              const cy = (holder.position.y + HELD_BALL_OFFSET_M.y) * scale;
              return (
                <View
                  key={ball.id}
                  pointerEvents="none"
                  style={{ position: 'absolute', left: cx - tokenSize / 2, top: cy - tokenSize / 2 }}
                >
                  <TokenView element={ball} size={tokenSize * 0.85} selected={ball.id === selectedId} />
                </View>
              );
            })}
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
              <Muted>
                Selected: {isBallSelected ? `ball ${ballIndex(scene, selectedId)}` : playerLabel(scene, selectedId)}
              </Muted>

              {isPlayerSelected && (
                <>
                  <ChipRow>
                    {selectedRun && (
                      <Chip label={triggerChipLabel()} onPress={onTriggerChip} testID="trigger-chip" />
                    )}
                    {selectedRun && (
                      <Chip label="✕ Remove run" onPress={removeRun} testID="remove-run" />
                    )}
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
                  <ChipRow>
                    <Chip
                      label={pickMode === 'pass' ? 'Tap the receiver…' : '＋ Pass'}
                      selected={pickMode === 'pass'}
                      onPress={() => {
                        if (!passBall) return;
                        setPickBallId(passBall.id);
                        setPickMode('pass');
                      }}
                      testID="add-pass"
                    />
                    {!passBall && <Muted>Give this player the ball to pass.</Muted>}
                  </ChipRow>
                </>
              )}

              {isBallSelected && (
                <ChipRow>
                  <Chip
                    label={pickMode === 'give' ? 'Tap a player…' : 'Give to player →'}
                    selected={pickMode === 'give'}
                    onPress={() => {
                      setPickBallId(selectedId);
                      setPickMode('give');
                    }}
                    testID="give-to-player"
                  />
                  <Chip label="Drop on ground" onPress={dropBall} testID="drop-ball" />
                  <Chip label="✕ Remove" onPress={removeSelected} testID="remove-ball" />
                </ChipRow>
              )}
            </>
          ) : (
            <Muted>Tap a player or ball to select. Drag from a player to draw a run.</Muted>
          )}

          {scene.passes.map((pass, idx) => (
            <View key={pass.id} style={styles.passRow} testID={`pass-row-${idx}`}>
              <Text style={styles.passLabel}>
                {idx + 1}. {playerLabel(scene, pass.fromId)} → {playerLabel(scene, pass.toId)}
                {ballElements.length > 1 ? `  · ball ${ballIndex(scene, pass.ballId)}` : ''}
              </Text>
              <Pressable onPress={() => cyclePassType(pass.id)} style={styles.passChip}>
                <Text style={styles.passChipText}>{pass.type}</Text>
              </Pressable>
              <Pressable onPress={() => cycleRelease(pass.id)} style={styles.passChip}>
                <Text style={styles.passChipText}>{releaseLabel(pass.releaseFrac)}</Text>
              </Pressable>
              <Pressable onPress={() => deletePass(pass.id, pass.ballId)} hitSlop={8}>
                <Text style={styles.deletePass}>✕</Text>
              </Pressable>
            </View>
          ))}

          {timeline.warnings.length > 0 && (
            <View style={styles.warnings} testID="timeline-warnings">
              {timeline.warnings.map((w, i) => (
                <Muted key={i}>{w}</Muted>
              ))}
            </View>
          )}
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
  warnings: { marginTop: spacing.sm, gap: spacing.xs },
  actionRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.md },
});
