import { useState } from 'react';
import { View } from 'react-native';

import { INTENSITY_OPTIONS, LEVEL_OPTIONS, SPACE_OPTIONS } from '../features/constants';
import { validateDrillInput, type DrillInput, type DrillVisibility } from '../features/drills';
import { useCategories, useEquipmentTypes, useSkillFocuses } from '../features/lookups';
import { useMyTeams } from '../features/teams';
import { useAuth } from '../providers/AuthProvider';
import { Button, ChipRow, Chip, ErrorText, Muted, SectionLabel, TextField } from '../ui/core';
import { ChipMultiSelect, ChipSelect, Stepper } from '../ui/pickers';

export const EMPTY_DRILL_INPUT: DrillInput = {
  name: '',
  description: '',
  setupInstructions: '',
  coachingPoints: '',
  categoryIds: [],
  minPlayers: 4,
  maxPlayers: 12,
  spaceNeeded: 'any',
  intensity: 'moderate',
  level: 'all',
  durationMinutes: 10,
  skillFocusIds: [],
  equipmentIds: [],
  visibility: 'private',
  sharedTeamIds: [],
};

const VISIBILITY_OPTIONS: DrillVisibility[] = ['private', 'team', 'public'];
const VISIBILITY_LABELS: Record<DrillVisibility, string> = {
  private: '🔒 Private',
  team: '👥 My teams',
  public: '🌍 Public',
};
const VISIBILITY_HINTS: Record<DrillVisibility, string> = {
  private: 'Only you can see this drill.',
  team: 'Coaches on the teams you pick can see and use it.',
  public: 'Every coach on Drill Deck can see and copy it.',
};

/**
 * Shared create/edit form. Field order is optimized for entry speed on a
 * phone: name → category → players → description, details below.
 */
export function DrillForm({
  initial,
  submitLabel,
  onSubmit,
  isSubmitting,
  submitError,
}: {
  initial: DrillInput;
  submitLabel: string;
  onSubmit: (input: DrillInput) => void;
  isSubmitting: boolean;
  submitError?: string;
}) {
  const [input, setInput] = useState<DrillInput>(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { profile } = useAuth();
  const categories = useCategories();
  const skills = useSkillFocuses();
  const equipment = useEquipmentTypes();
  const myTeams = useMyTeams(profile?.id);

  const set = <K extends keyof DrillInput>(key: K, value: DrillInput[K]) =>
    setInput((prev) => ({ ...prev, [key]: value }));

  const toggleIn = (list: string[], id: string) =>
    list.includes(id) ? list.filter((x) => x !== id) : [...list, id];

  const handleSubmit = () => {
    const validation = validateDrillInput(input);
    setErrors(validation);
    if (Object.keys(validation).length === 0) {
      onSubmit(input);
    }
  };

  return (
    <View testID="drill-form">
      <TextField
        label="Drill name *"
        value={input.name}
        onChangeText={(v) => set('name', v)}
        placeholder="e.g. 3v2 decision grid"
        error={errors.name}
        testID="drill-name-input"
      />

      <SectionLabel>Category *</SectionLabel>
      <ChipMultiSelect
        options={categories.data ?? []}
        selectedIds={input.categoryIds}
        onToggle={(id) => set('categoryIds', toggleIn(input.categoryIds, id))}
      />
      <ErrorText>{errors.categoryId}</ErrorText>

      <SectionLabel>Players *</SectionLabel>
      <Stepper
        label="Minimum"
        value={input.minPlayers}
        min={1}
        max={30}
        onChange={(v) => set('minPlayers', v)}
        testID="min-players"
      />
      <Stepper
        label="Maximum"
        value={input.maxPlayers}
        min={1}
        max={40}
        onChange={(v) => set('maxPlayers', v)}
        testID="max-players"
      />
      <ErrorText>{errors.players}</ErrorText>

      <TextField
        label="What happens (description)"
        value={input.description}
        onChangeText={(v) => set('description', v)}
        placeholder="Attackers work the ball through the grid…"
        multiline
        testID="drill-description-input"
      />

      <SectionLabel>Skill focuses</SectionLabel>
      <ChipMultiSelect
        options={skills.data ?? []}
        selectedIds={input.skillFocusIds}
        onToggle={(id) => set('skillFocusIds', toggleIn(input.skillFocusIds, id))}
      />

      <SectionLabel>Equipment needed</SectionLabel>
      <ChipMultiSelect
        options={equipment.data ?? []}
        selectedIds={input.equipmentIds}
        onToggle={(id) => set('equipmentIds', toggleIn(input.equipmentIds, id))}
      />

      <SectionLabel>Space</SectionLabel>
      <ChipSelect
        options={SPACE_OPTIONS}
        value={input.spaceNeeded as (typeof SPACE_OPTIONS)[number]}
        onChange={(v) => set('spaceNeeded', v)}
      />

      <SectionLabel>Intensity</SectionLabel>
      <ChipSelect
        options={INTENSITY_OPTIONS}
        value={input.intensity as (typeof INTENSITY_OPTIONS)[number]}
        onChange={(v) => set('intensity', v)}
      />

      <SectionLabel>Age / level</SectionLabel>
      <ChipSelect
        options={LEVEL_OPTIONS}
        value={input.level as (typeof LEVEL_OPTIONS)[number]}
        onChange={(v) => set('level', v)}
      />

      <Stepper
        label="Typical duration (min)"
        value={input.durationMinutes}
        min={1}
        max={90}
        step={5}
        onChange={(v) => set('durationMinutes', v)}
        testID="duration"
      />
      <ErrorText>{errors.duration}</ErrorText>

      <TextField
        label="Setup instructions"
        value={input.setupInstructions}
        onChangeText={(v) => set('setupInstructions', v)}
        placeholder="20x20 grid, two groups on opposite cones…"
        multiline
      />
      <TextField
        label="Coaching points"
        value={input.coachingPoints}
        onChangeText={(v) => set('coachingPoints', v)}
        placeholder="Hands up early, run straight, communicate…"
        multiline
      />

      <SectionLabel>Who can see this drill?</SectionLabel>
      <ChipRow>
        {VISIBILITY_OPTIONS.map((vis) => (
          <Chip
            key={vis}
            label={VISIBILITY_LABELS[vis]}
            selected={input.visibility === vis}
            onPress={() => set('visibility', vis)}
            testID={`visibility-${vis}`}
          />
        ))}
      </ChipRow>
      <Muted>{VISIBILITY_HINTS[input.visibility]}</Muted>
      {input.visibility === 'team' && (
        <>
          <SectionLabel>Share with which teams?</SectionLabel>
          {(myTeams.data ?? []).length === 0 ? (
            <Muted>You&apos;re not on any team yet — create or join one from the Teams tab.</Muted>
          ) : (
            <ChipMultiSelect
              options={(myTeams.data ?? []).map((t) => ({ id: t.id, name: t.name }))}
              selectedIds={input.sharedTeamIds}
              onToggle={(id) => set('sharedTeamIds', toggleIn(input.sharedTeamIds, id))}
            />
          )}
        </>
      )}
      <ErrorText>{errors.visibility}</ErrorText>

      <ErrorText>{submitError}</ErrorText>
      <Button
        label={submitLabel}
        onPress={handleSubmit}
        loading={isSubmitting}
        testID="submit-drill"
      />
    </View>
  );
}
