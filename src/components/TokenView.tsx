import { StyleSheet, Text, View } from 'react-native';

import type { SceneElement } from '../scene/schema';
import { colors } from '../ui/theme';

export const TOKEN_SIZE = 28;

const TEAM_COLORS = {
  attack: colors.attack,
  defence: colors.defence,
  neutral: colors.neutral,
} as const;

/** Pure visual for a diagram element (players, cones, balls). Arrows render in SVG. */
export function TokenView({
  element,
  size = TOKEN_SIZE,
  selected = false,
}: {
  element: SceneElement;
  size?: number;
  selected?: boolean;
}) {
  if (element.type === 'player') {
    return (
      <View
        style={[
          styles.player,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: TEAM_COLORS[element.team],
          },
          selected && styles.selected,
        ]}
      >
        {element.label ? (
          <Text style={[styles.playerLabel, { fontSize: size * 0.45 }]}>{element.label}</Text>
        ) : null}
      </View>
    );
  }

  if (element.type === 'cone') {
    return (
      <View style={[styles.coneWrap, { width: size, height: size }, selected && styles.selected]}>
        <View
          style={[
            styles.cone,
            {
              borderLeftWidth: size * 0.38,
              borderRightWidth: size * 0.38,
              borderBottomWidth: size * 0.75,
            },
          ]}
        />
      </View>
    );
  }

  if (element.type === 'ball') {
    return (
      <View
        style={[
          styles.ball,
          {
            width: size * 0.9,
            height: size * 0.6,
            borderRadius: size * 0.3,
          },
          selected && styles.selected,
        ]}
      />
    );
  }

  return null; // arrows are drawn in the SVG layer
}

const styles = StyleSheet.create({
  player: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.85)',
  },
  playerLabel: { color: '#ffffff', fontWeight: '800' },
  coneWrap: { alignItems: 'center', justifyContent: 'flex-end' },
  cone: {
    width: 0,
    height: 0,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: colors.cone,
  },
  ball: {
    backgroundColor: colors.ball,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.85)',
    transform: [{ rotate: '-30deg' }],
  },
  selected: {
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 8,
    transform: [{ scale: 1.15 }],
  },
});
