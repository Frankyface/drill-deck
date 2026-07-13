import { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
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
  type SceneHistory,
} from '../scene/logic';
import { samplesToKeyframes, simplifyPath } from '../scene/playback';
import {
  PITCH_BACKGROUNDS,
  type Phase,
  type SceneElement,
  type SceneV2,
  type Team,
  type Vec2,
} from '../scene/schema';
import { Button, Chip, ChipRow, Muted, SectionLabel } from '../ui/core';
import { Stepper } from '../ui/pickers';
import { colors, radius, spacing } from '../ui/theme';
import { canvasHeightFor } from './DiagramCanvas';
import { DraggableToken, type EditorMode } from './DraggableToken';
import { PlaybackView } from './PlaybackView';
import { SvgPitch } from './SvgPitch';
import { TOKEN_SIZE } from './TokenView';

const PHASE_STEP_MS = 500;

function nextPlayerLabel(scene: SceneV2, team: Team): string {
  const count = scene.elements.filter(
    (el) => el.type === 'player' && el.team === team,
  ).length;
  return String(count + 1);
}

let phaseCounter = 0;
function newPhase(existingCount: number): Phase {
  phaseCounter += 1;
  return {
    id: `phase-${Date.now().toString(36)}-${phaseCounter}`,
    name: `Step ${existingCount + 1}`,
    durationMs: 3000,
    tracks: [],
  };
}

export function DiagramEditor({
  initialScene,
  onSave,
  isSaving,
}: {
  initialScene: SceneV2;
  onSave: (scene: SceneV2) => void;
  isSaving: boolean;
}) {
  const [history, setHistory] = useState<SceneHistory>(() => createHistory(initialScene));
  const [mode, setMode] = useState<EditorMode>('move');
  const [isPlayMode, setIsPlayMode] = useState(false);
  const [activePhaseId, setActivePhaseId] = useState<string | null>(null);
  const [canvasWidth, setCanvasWidth] = useState(0);
  const [arrowPreview, setArrowPreview] = useState<Vec2[]>([]);

  const scene = history.present;
  const scale = canvasWidth > 0 ? scaleForCanvas(canvasWidth) : 1;
  const tokenSize = Math.max(20, Math.min(TOKEN_SIZE + 6, canvasWidth / 11));

  // Buffers for gesture-recorded data (JS side)
  const arrowSamples = useRef<Vec2[]>([]);
  const recordSamples = useRef<{ position: Vec2; atMs: number }[]>([]);

  const apply = (next: SceneV2) => setHistory((h) => commit(h, next));

  // ---- palette actions ----
  const addPlayer = (team: Team) => {
    apply(
      addElement(scene, {
        id: newElementId(),
        type: 'player',
        team,
        label: nextPlayerLabel(scene, team),
        position: { x: 35, y: 50 },
      }),
    );
  };

  const addCone = () =>
    apply(addElement(scene, { id: newElementId(), type: 'cone', position: { x: 35, y: 46 } }));

  const addBall = () =>
    apply(addElement(scene, { id: newElementId(), type: 'ball', position: { x: 35, y: 54 } }));

  const cyclePitch = () => {
    const idx = PITCH_BACKGROUNDS.indexOf(scene.pitch);
    apply(setPitch(scene, PITCH_BACKGROUNDS[(idx + 1) % PITCH_BACKGROUNDS.length]));
  };

  // ---- token callbacks ----
  const handleCommitMove = (elementId: string, meters: Vec2) =>
    apply(moveElement(scene, elementId, meters));

  const handleDelete = (elementId: string) => apply(removeElement(scene, elementId));

  const handleRecordSample = (_elementId: string, meters: Vec2) => {
    recordSamples.current.push({ position: meters, atMs: Date.now() });
  };

  const handleRecordEnd = (elementId: string) => {
    const samples = recordSamples.current;
    recordSamples.current = [];
    if (!activePhaseId || samples.length < 3) return;
    const keyframes = samplesToKeyframes(samples);
    if (keyframes.length < 2) return;
    apply({
      ...scene,
      phases: scene.phases.map((phase) =>
        phase.id === activePhaseId
          ? {
              ...phase,
              tracks: [
                ...phase.tracks.filter((tr) => tr.elementId !== elementId),
                { elementId, keyframes },
              ],
            }
          : phase,
      ),
    });
  };

  // ---- arrow drawing (pan over the whole canvas while in an arrow mode) ----
  const isArrowMode = mode === 'arrow-run' || mode === 'arrow-pass';

  const pushArrowSample = (pxX: number, pxY: number) => {
    const m = pxToMeters({ x: pxX, y: pxY }, scale);
    arrowSamples.current.push(m);
    if (arrowSamples.current.length % 3 === 0) {
      setArrowPreview([...arrowSamples.current]);
    }
  };

  const finishArrow = () => {
    const raw = arrowSamples.current;
    arrowSamples.current = [];
    setArrowPreview([]);
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

  const arrowGesture = Gesture.Pan()
    .enabled(isArrowMode)
    .onStart((e) => {
      runOnJS(pushArrowSample)(e.x, e.y);
    })
    .onUpdate((e) => {
      runOnJS(pushArrowSample)(e.x, e.y);
    })
    .onEnd(() => {
      runOnJS(finishArrow)();
    });

  // ---- phases ----
  const addPhase = () => {
    const phase = newPhase(scene.phases.length);
    apply({ ...scene, phases: [...scene.phases, phase] });
    setActivePhaseId(phase.id);
    setMode('record');
  };

  const updatePhaseDuration = (phaseId: string, durationMs: number) => {
    apply({
      ...scene,
      phases: scene.phases.map((p) => (p.id === phaseId ? { ...p, durationMs } : p)),
    });
  };

  const deletePhase = (phaseId: string) => {
    apply({ ...scene, phases: scene.phases.filter((p) => p.id !== phaseId) });
    if (activePhaseId === phaseId) setActivePhaseId(null);
  };

  const heightPx = canvasWidth > 0 ? canvasHeightFor(canvasWidth) : 0;
  const arrows = scene.elements.filter((el) => el.type === 'arrow');
  const tokens = scene.elements.filter((el) => el.type !== 'arrow');

  if (isPlayMode) {
    return (
      <View>
        <View onLayout={(e) => setCanvasWidth(e.nativeEvent.layout.width)}>
          {canvasWidth > 0 && <PlaybackView scene={scene} widthPx={canvasWidth} />}
        </View>
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
          onPress={() => setHistory((h) => (canUndo(h) ? { past: h.past.slice(0, -1), present: h.past[h.past.length - 1] } : h))}
          testID="undo"
        />
      </ChipRow>

      {isArrowMode ? (
        <Muted>Drag on the pitch to draw the arrow (release to place it).</Muted>
      ) : mode === 'record' ? (
        <Muted>Recording: drag a piece along its run — it snaps back when you let go.</Muted>
      ) : (
        <Muted>Drag pieces to move them. Long-press a piece to delete it.</Muted>
      )}

      {/* canvas */}
      <View
        style={styles.canvasWrap}
        onLayout={(e) => setCanvasWidth(e.nativeEvent.layout.width)}
        testID="editor-canvas"
      >
        {canvasWidth > 0 && (
          <GestureDetector gesture={arrowGesture}>
            <Animated.View style={{ width: canvasWidth, height: heightPx }}>
              <SvgPitch pitch={scene.pitch} widthPx={canvasWidth} />
              <Svg width={canvasWidth} height={heightPx} style={StyleSheet.absoluteFill}>
                {arrows.map((arrow) => (
                  <Polyline
                    key={arrow.id}
                    points={arrow.points.map((p) => `${p.x * scale},${p.y * scale}`).join(' ')}
                    fill="none"
                    stroke={arrow.style === 'pass' ? '#fde68a' : '#ffffff'}
                    strokeWidth={2.5}
                    strokeDasharray={arrow.style === 'pass' ? '7 6' : undefined}
                    strokeLinecap="round"
                  />
                ))}
                {arrowPreview.length >= 2 && (
                  <Polyline
                    points={arrowPreview.map((p) => `${p.x * scale},${p.y * scale}`).join(' ')}
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
                  onCommitMove={handleCommitMove}
                  onDelete={handleDelete}
                  onRecordSample={handleRecordSample}
                  onRecordEnd={handleRecordEnd}
                />
              ))}
            </Animated.View>
          </GestureDetector>
        )}
      </View>

      {/* arrows list for deletion (long-press can't hit SVG lines reliably) */}
      {arrows.length > 0 && (
        <ChipRow>
          {arrows.map((arrow, idx) => (
            <Chip
              key={arrow.id}
              label={`✕ ${arrow.style} arrow ${idx + 1}`}
              onPress={() => handleDelete(arrow.id)}
              testID={`delete-arrow-${idx}`}
            />
          ))}
        </ChipRow>
      )}

      {/* animation phases */}
      <SectionLabel>Animation</SectionLabel>
      {scene.phases.length === 0 && (
        <Muted>Add a step, then drag pieces to record their runs. Play shows the drill in motion.</Muted>
      )}
      {scene.phases.map((phase) => (
        <View key={phase.id} style={styles.phaseRow}>
          <Pressable
            onPress={() => {
              setActivePhaseId(phase.id);
              setMode('record');
            }}
            style={[styles.phaseName, activePhaseId === phase.id && mode === 'record' && styles.phaseActive]}
            testID={`phase-${phase.name}`}
          >
            <Text style={styles.phaseNameText}>
              {phase.name} · {phase.tracks.length} run{phase.tracks.length === 1 ? '' : 's'}
            </Text>
          </Pressable>
          <Stepper
            label=""
            value={phase.durationMs / 1000}
            min={0.5}
            max={30}
            step={PHASE_STEP_MS / 1000}
            onChange={(sec) => updatePhaseDuration(phase.id, Math.round(sec * 1000))}
          />
          <Pressable onPress={() => deletePhase(phase.id)} hitSlop={8}>
            <Text style={styles.deletePhase}>✕</Text>
          </Pressable>
        </View>
      ))}
      <View style={styles.actionRow}>
        <Button label="+ Add step" variant="secondary" onPress={addPhase} testID="add-phase" />
        <Button
          label="▶ Play"
          variant="secondary"
          onPress={() => setIsPlayMode(true)}
          disabled={scene.phases.length === 0}
          testID="enter-play-mode"
        />
      </View>

      <Button
        label={isSaving ? 'Saving…' : 'Save diagram'}
        onPress={() => onSave(scene)}
        loading={isSaving}
        testID="save-diagram"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  canvasWrap: {
    marginVertical: spacing.md,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  phaseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  phaseName: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.chipBg,
  },
  phaseActive: { backgroundColor: colors.chipSelectedBg },
  phaseNameText: { fontWeight: '600', color: colors.text },
  deletePhase: { color: colors.danger, fontSize: 18, fontWeight: '700', padding: spacing.sm },
  actionRow: { flexDirection: 'row', gap: spacing.md },
});
