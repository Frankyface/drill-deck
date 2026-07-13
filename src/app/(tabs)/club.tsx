import { useState } from 'react';
import { Text, View } from 'react-native';

import {
  useAddTeam,
  useClubMembers,
  useMyTeamIds,
  useSetTeamMembership,
  useTeams,
} from '../../features/club';
import { useAuth } from '../../providers/AuthProvider';
import {
  Button,
  Card,
  Chip,
  ChipRow,
  ErrorText,
  Muted,
  Screen,
  SectionLabel,
  TextField,
  Title,
} from '../../ui/core';
import { colors, font, spacing } from '../../ui/theme';

export default function ClubScreen() {
  const { profile, isAdmin, signOut, session } = useAuth();
  const teams = useTeams();
  const myTeamIds = useMyTeamIds(profile?.id);
  const members = useClubMembers();
  const setMembership = useSetTeamMembership();
  const addTeam = useAddTeam();
  const [newTeamName, setNewTeamName] = useState('');
  const [teamError, setTeamError] = useState<string | null>(null);

  const clubName = profile?.clubs?.name ?? 'Your club';

  return (
    <Screen testID="club-screen">
      <Title>{clubName}</Title>

      <Card testID="profile-card">
        <Text style={{ fontSize: font.lg, fontWeight: '700', color: colors.text }}>
          {profile?.display_name ?? session?.user.email}
        </Text>
        <Muted>
          {isAdmin ? 'Admin' : 'Coach'} · {session?.user.email}
        </Muted>
      </Card>

      {isAdmin && profile?.clubs?.invite_code ? (
        <Card testID="invite-card">
          <SectionLabel>Coach invite code</SectionLabel>
          <Text style={{ fontSize: font.xl, fontWeight: '800', color: colors.primary }}>
            {profile.clubs.invite_code}
          </Text>
          <Muted>
            Share this with your coaches — they sign up in the app with it. First account in the
            club became admin (that&apos;s you).
          </Muted>
        </Card>
      ) : null}

      <SectionLabel>My teams (tap to join or leave)</SectionLabel>
      <ChipRow>
        {(teams.data ?? []).map((team) => {
          const isMember = (myTeamIds.data ?? []).includes(team.id);
          return (
            <Chip
              key={team.id}
              label={`${isMember ? '✓ ' : ''}${team.name}`}
              selected={isMember}
              onPress={() =>
                profile &&
                setMembership.mutate({ teamId: team.id, profileId: profile.id, join: !isMember })
              }
              testID={`team-chip-${team.name}`}
            />
          );
        })}
      </ChipRow>
      <Muted>You can only build sessions for teams you&apos;ve joined.</Muted>

      {isAdmin ? (
        <View style={{ marginTop: spacing.md }}>
          <TextField
            label="Add a team"
            value={newTeamName}
            onChangeText={setNewTeamName}
            placeholder="e.g. U14s"
            testID="new-team-input"
          />
          <ErrorText>{teamError}</ErrorText>
          <Button
            label="Add team"
            variant="secondary"
            onPress={() => {
              setTeamError(null);
              if (!newTeamName.trim()) return setTeamError('Enter a team name.');
              if (!profile) return;
              addTeam.mutate(
                {
                  name: newTeamName,
                  clubId: profile.club_id,
                  sortOrder: (teams.data ?? []).length,
                },
                {
                  onSuccess: () => setNewTeamName(''),
                  onError: (e) => setTeamError(String(e)),
                },
              );
            }}
            loading={addTeam.isPending}
            testID="add-team-button"
          />
        </View>
      ) : null}

      <SectionLabel>Coaches at the club</SectionLabel>
      <Card>
        {(members.data ?? []).map((member) => (
          <View
            key={member.id}
            style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 }}
          >
            <Text style={{ color: colors.text, fontWeight: '600' }}>{member.display_name}</Text>
            <Muted>{member.role}</Muted>
          </View>
        ))}
      </Card>

      <Button label="Sign out" variant="danger" onPress={signOut} testID="sign-out" />
    </Screen>
  );
}
