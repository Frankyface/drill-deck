import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DrillCard } from '../../components/DrillCard';
import { INTENSITY_OPTIONS, LEVEL_OPTIONS } from '../../features/constants';
import { useAllDiagramScenes } from '../../features/diagrams';
import {
  countActiveFilters,
  EMPTY_FILTERS,
  filterDrills,
  sortDrills,
  type DrillFilters,
  type DrillSort,
} from '../../features/drillFilters';
import { useDrills } from '../../features/drills';
import { useCategories, useEquipmentTypes, useSkillFocuses } from '../../features/lookups';
import { Button, Chip, ChipRow, EmptyState, LoadingState, Muted, SectionLabel } from '../../ui/core';
import { ChipMultiSelect, ChipSelect, Stepper } from '../../ui/pickers';
import { colors, font, radius, spacing } from '../../ui/theme';

export default function LibraryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const drills = useDrills();
  const scenes = useAllDiagramScenes();
  const categories = useCategories();
  const skills = useSkillFocuses();
  const equipment = useEquipmentTypes();

  const [filters, setFilters] = useState<DrillFilters>(EMPTY_FILTERS);
  const [sort, setSort] = useState<DrillSort>('newest');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isPlayerFilterOn, setIsPlayerFilterOn] = useState(false);

  const set = <K extends keyof DrillFilters>(key: K, value: DrillFilters[K]) =>
    setFilters((prev) => ({ ...prev, [key]: value }));

  const visible = useMemo(
    () => sortDrills(filterDrills(drills.data ?? [], filters), sort),
    [drills.data, filters, sort],
  );

  const activeCount = countActiveFilters(filters);

  return (
    <View style={[styles.screen, { paddingTop: insets.top + spacing.md }]} testID="library-screen">
      <View style={styles.headerRow}>
        <Text style={styles.title}>Library</Text>
        <Button label="+ Add drill" onPress={() => router.push('/drill/new')} testID="add-drill" />
      </View>

      <TextInput
        style={styles.search}
        placeholder="Search drills…"
        placeholderTextColor={colors.textMuted}
        value={filters.search}
        onChangeText={(v) => set('search', v)}
        testID="search-input"
      />

      <ChipRow>
        <Chip
          label={activeCount > 0 ? `Filters (${activeCount})` : 'Filters'}
          selected={isFilterOpen}
          onPress={() => setIsFilterOpen(!isFilterOpen)}
          testID="toggle-filters"
        />
        <Chip label="Newest" selected={sort === 'newest'} onPress={() => setSort('newest')} />
        <Chip label="A–Z" selected={sort === 'name'} onPress={() => setSort('name')} />
        <Chip label="Top rated" selected={sort === 'rating'} onPress={() => setSort('rating')} />
      </ChipRow>

      {isFilterOpen && (
        <View style={styles.filterPanel} testID="filter-panel">
          <SectionLabel>Category</SectionLabel>
          <ChipRow>
            {(categories.data ?? []).map((cat) => (
              <Chip
                key={cat.id}
                label={cat.name}
                selected={filters.categoryId === cat.id}
                onPress={() => set('categoryId', filters.categoryId === cat.id ? null : cat.id)}
                testID={`filter-category-${cat.name}`}
              />
            ))}
          </ChipRow>

          <SectionLabel>Players tonight</SectionLabel>
          <ChipRow>
            <Chip
              label={isPlayerFilterOn ? `Filtering for ${filters.playerCount} players` : 'Any number'}
              selected={isPlayerFilterOn}
              onPress={() => {
                if (isPlayerFilterOn) {
                  setIsPlayerFilterOn(false);
                  set('playerCount', null);
                } else {
                  setIsPlayerFilterOn(true);
                  set('playerCount', 12);
                }
              }}
              testID="toggle-player-filter"
            />
          </ChipRow>
          {isPlayerFilterOn && (
            <Stepper
              label="How many showed up?"
              value={filters.playerCount ?? 12}
              min={1}
              max={40}
              onChange={(v) => set('playerCount', v)}
              testID="player-count"
            />
          )}

          <SectionLabel>Skill focus (must include all)</SectionLabel>
          <ChipMultiSelect
            options={skills.data ?? []}
            selectedIds={filters.skillFocusIds}
            onToggle={(id) =>
              set(
                'skillFocusIds',
                filters.skillFocusIds.includes(id)
                  ? filters.skillFocusIds.filter((x) => x !== id)
                  : [...filters.skillFocusIds, id],
              )
            }
          />

          <SectionLabel>I only have this equipment</SectionLabel>
          <ChipMultiSelect
            options={equipment.data ?? []}
            selectedIds={filters.equipmentIds}
            onToggle={(id) =>
              set(
                'equipmentIds',
                filters.equipmentIds.includes(id)
                  ? filters.equipmentIds.filter((x) => x !== id)
                  : [...filters.equipmentIds, id],
              )
            }
          />

          <SectionLabel>Intensity</SectionLabel>
          <ChipSelect
            options={INTENSITY_OPTIONS}
            value={(filters.intensity as (typeof INTENSITY_OPTIONS)[number]) ?? null}
            onChange={(v) => set('intensity', filters.intensity === v ? null : v)}
          />

          <SectionLabel>Level</SectionLabel>
          <ChipSelect
            options={LEVEL_OPTIONS}
            value={(filters.level as (typeof LEVEL_OPTIONS)[number]) ?? null}
            onChange={(v) => set('level', filters.level === v ? null : v)}
          />

          <ChipRow>
            <Chip
              label="★ 4+ only"
              selected={filters.minRating === 4}
              onPress={() => set('minRating', filters.minRating === 4 ? null : 4)}
            />
            <Chip
              label="Archived"
              selected={filters.showArchived}
              onPress={() => set('showArchived', !filters.showArchived)}
              testID="filter-archived"
            />
            <Chip
              label="Clear all"
              onPress={() => {
                setFilters(EMPTY_FILTERS);
                setIsPlayerFilterOn(false);
              }}
              testID="clear-filters"
            />
          </ChipRow>
        </View>
      )}

      {drills.isLoading ? (
        <LoadingState />
      ) : drills.isError ? (
        <EmptyState title="Couldn't load the library" hint={String(drills.error)} />
      ) : (
        <FlatList
          data={visible}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: spacing.xxl }}
          refreshing={drills.isRefetching}
          onRefresh={() => drills.refetch()}
          renderItem={({ item }) => (
            <DrillCard
              drill={item}
              scene={scenes.data?.[item.id] ?? null}
              onPress={() => router.push(`/drill/${item.id}`)}
            />
          )}
          ListEmptyComponent={
            <EmptyState
              title={
                (drills.data ?? []).length === 0
                  ? 'No drills yet'
                  : 'No drills match'
              }
              hint={
                (drills.data ?? []).length === 0
                  ? 'Add your first drill with the button above.'
                  : 'Try removing a filter or changing the search.'
              }
            />
          }
          ListFooterComponent={
            visible.length > 0 ? (
              <Muted>
                {visible.length} drill{visible.length === 1 ? '' : 's'}
              </Muted>
            ) : null
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: spacing.lg },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  title: { fontSize: font.title, fontWeight: '800', color: colors.text },
  search: {
    minHeight: 44,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.card,
    paddingHorizontal: spacing.md,
    fontSize: font.md,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  filterPanel: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
});
