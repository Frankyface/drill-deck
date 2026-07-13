# Handoff — drill-deck
_Last updated: 2026-07-12 · Current stage: stage-1-foundation_

## 🎯 Goals
Stand up the working shared drill library: an Expo app + Supabase backend where
a coach signs in on their phone, adds a tagged drill, and finds drills by filter.

## 📍 Current State
- Full doc system scaffolded, committed, and pushed to Frankyface/drill-deck (private).
- No application code exists yet — the Expo app has not been created.
- Supabase project not created yet (free tier; creation needs a cost-confirm step).
- Stage 1 fully specified in `staging/stage-1-foundation/`; Stages 2–5 are sketches.

## 📂 Files I'm Working On
- `staging/stage-1-foundation/feature-project-setup.md` — the active feature spec.

## ✅ Things I've Changed
- 2026-07-12: Scaffolded the complete doc system (docs/, staging/, commands),
  merged onto the existing GitHub stub commit, pushed to main.

## ❌ Watch Out
- Nothing yet — `docs/failed-approaches.md` is empty (expected at day zero).
- `gh` CLI is NOT installed on this machine; use plain git over HTTPS (works).

## ➡️ Next Up
1. Scaffold the Expo app at the repo root: `npx create-expo-app@latest . --template`
   (TypeScript), confirm it boots via `npx expo start` + Expo Go on Cam's phone.
2. Create the Supabase project (free tier) via the connected Supabase tooling.
3. Wire supabase-js with `.env` + `.env.example`; smoke test: app screen shows a
   row fetched from a `health_check` table. Full spec in the active feature file.

## 🔗 Pointer
→ Current stage folder: `staging/stage-1-foundation/` · Active feature file:
`staging/stage-1-foundation/feature-project-setup.md`
