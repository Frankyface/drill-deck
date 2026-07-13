import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  useCreateTeam,
  useJoinTeamByCode,
  useLeaveTeam,
  useMyTeams,
  useRegenerateTeamCode,
  useTeamMembers,
  useUpdateDisplayName,
} from '../../features/teams';
import { useAuth } from '../../providers/AuthProvider';
import {
  Button,
  Card,
  ErrorText,
  Muted,
  Screen,
  SectionLabel,
  TextField,
  Title,
} from '../../ui/core';
import { colors, font, spacing } from '../../ui/theme';

function TeamCard({
  teamId,
  name,
  inviteCode,
  myRole,
  profileId,
}: {
  teamId: string;
  name: string;
  inviteCode: string;
  myRole: string;
  profileId: string;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const members = useTeamMembers(isExpanded ? teamId : undefined);
  const leaveTeam = useLeaveTeam();
  const regenerate = useRegenerateTeamCode();
  const isAdmin = myRole === 'admin';

  return (
    <Card testID={`team-card-${name}`}>
      <Pressable onPress={() => setIsExpanded(!isExpanded)} accessibilityRole="button">
        <View style={styles.teamHeader}>
          <Text style={styles.teamName}>{name}</Text>
          <Muted>{isAdmin ? 'admin' : 'coach'} · {isExpanded ? '▲' : '▼'}</Muted>
        </View>
      </Pressable>

      {isExpanded && (
        <View>
          <SectionLabel>Invite code — share with your coaches</SectionLabel>
          <Text style={styles.inviteCode} testID={`invite-code-${name}`}>
            {inviteCode}
          </Text>
          {isAdmin && (
            <Button
              label="Regenerate code (revokes the old one)"
              variant="secondary"
              loading={regenerate.isPending}
              onPress={() => regenerate.mutate(teamId)}
            />
          )}

          <SectionLabel>Coaches</SectionLabel>
          {(members.data ?? []).map((member) => (
            <View key={member.profile_id} style={styles.memberRow}>
              <Text style={styles.memberName}>
                {member.profiles?.display_name ?? 'Coach'}
              </Text>
              <Muted>{member.role}</Muted>
            </View>
          ))}

          <Button
            label="Leave team"
            variant="danger"
            loading={leaveTeam.isPending}
            onPress={() => leaveTeam.mutate({ teamId, profileId })}
            testID={`leave-${name}`}
          />
        </View>
      )}
    </Card>
  );
}

export default function TeamsScreen() {
  const { profile, signOut, refreshProfile, session } = useAuth();
  const myTeams = useMyTeams(profile?.id);
  const createTeam = useCreateTeam();
  const joinTeam = useJoinTeamByCode();
  const updateName = useUpdateDisplayName();

  const [newTeamName, setNewTeamName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  return (
    <Screen testID="teams-screen">
      <Title>My teams</Title>

      {(myTeams.data ?? []).length === 0 && (
        <Muted>
          You&apos;re not on a team yet. Create one (you become its admin) or join with a code from
          another coach. Teams are how you share drills and plan sessions together.
        </Muted>
      )}
      {(myTeams.data ?? []).map((team) => (
        <TeamCard
          key={team.id}
          teamId={team.id}
          name={team.name}
          inviteCode={team.invite_code}
          myRole={team.my_role}
          profileId={profile?.id ?? ''}
        />
      ))}

      <SectionLabel>Create a team</SectionLabel>
      <TextField
        label="Team name"
        value={newTeamName}
        onChangeText={setNewTeamName}
        placeholder="e.g. 1st XV"
        testID="new-team-input"
      />
      <Button
        label="Create team"
        variant="secondary"
        loading={createTeam.isPending}
        onPress={() => {
          setError(null);
          setFeedback(null);
          if (!newTeamName.trim()) return setError('Enter a team name.');
          createTeam.mutate(newTeamName, {
            onSuccess: () => {
              setNewTeamName('');
              setFeedback('Team created — you are its admin. Share the invite code below.');
            },
            onError: (e) => setError(String(e)),
          });
        }}
        testID="create-team-button"
      />

      <SectionLabel>Join a team</SectionLabel>
      <TextField
        label="Invite code"
        value={joinCode}
        onChangeText={setJoinCode}
        autoCapitalize="characters"
        placeholder="e.g. 7F3A9C21"
        testID="join-code-input"
      />
      <Button
        label="Join team"
        variant="secondary"
        loading={joinTeam.isPending}
        onPress={() => {
          setError(null);
          setFeedback(null);
          if (!joinCode.trim()) return setError('Enter an invite code.');
          joinTeam.mutate(joinCode, {
            onSuccess: (teamName) => {
              setJoinCode('');
              setFeedback(`Joined ${teamName}! 🎉`);
            },
            onError: (e) => setError(String(e)),
          });
        }}
        testID="join-team-button"
      />
      <ErrorText>{error}</ErrorText>
      {feedback ? <Text style={styles.feedback}>{feedback}</Text> : null}

      <SectionLabel>My profile</SectionLabel>
      <Card testID="profile-card">
        <Text style={styles.profileName}>{profile?.display_name}</Text>
        <Muted>{session?.user.email}</Muted>
        <TextField
          label="Change display name"
          value={displayName}
          onChangeText={setDisplayName}
          placeholder={profile?.display_name}
        />
        <Button
          label="Save name"
          variant="secondary"
          loading={updateName.isPending}
          onPress={() => {
            if (!displayName.trim() || !profile) return;
            updateName.mutate(
              { profileId: profile.id, displayName },
              {
                onSuccess: () => {
                  setDisplayName('');
                  refreshProfile();
                },
              },
            );
          }}
        />
      </Card>

      <Button label="Sign out" variant="danger" onPress={signOut} testID="sign-out" />
    </Screen>
  );
}

const styles = StyleSheet.create({
  teamHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  teamName: { fontSize: font.lg, fontWeight: '800', color: colors.text },
  inviteCode: {
    fontSize: font.xl,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: 2,
    marginBottom: spacing.sm,
  },
  memberRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  memberName: { color: colors.text, fontWeight: '600' },
  profileName: { fontSize: font.lg, fontWeight: '700', color: colors.text },
  feedback: { color: colors.primary, fontWeight: '700', marginVertical: spacing.sm },
});
