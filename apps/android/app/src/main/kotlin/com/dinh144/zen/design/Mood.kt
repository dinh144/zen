package com.dinh144.zen.design

// The sixteen moods — same set and order as apps/web/lib/drop.ts's EXPRESSIONS.
enum class Mood {
    Neutral, Attentive, Surprised, Excited, Happy, Laughing, Angry, Sad, Scared,
    Suspicious, Confused, Curious, Proud, Shy, Unimpressed, Sleepy,
}

// The real app states DESIGN.md's Visual decisions binds each mood to ("Sixteen moods,
// each bound to a real state"). One extra state (CardSettling) shares Sleepy with Drifting,
// matching the design doc's own "sleepy (drift, and a card still settling)" line.
enum class ZenAppState {
    Resting, SearchFocused, Typing, ResultsShown, NothingFound, Saved, TagsLanded, MarkEarned,
    SpaceCreated, Drifting, CardSettling, SharedSpace, PasswordScreen, WrongPassword, LettingGo,
    AiUnreachable, BoardTightened,
}

val MOOD_FOR_STATE: Map<ZenAppState, Mood> = mapOf(
    ZenAppState.Resting to Mood.Neutral,
    ZenAppState.SearchFocused to Mood.Attentive,
    ZenAppState.Typing to Mood.Curious,
    ZenAppState.ResultsShown to Mood.Surprised,
    ZenAppState.NothingFound to Mood.Confused,
    ZenAppState.Saved to Mood.Excited,
    ZenAppState.TagsLanded to Mood.Happy,
    ZenAppState.MarkEarned to Mood.Laughing,
    ZenAppState.SpaceCreated to Mood.Proud,
    ZenAppState.Drifting to Mood.Sleepy,
    ZenAppState.CardSettling to Mood.Sleepy,
    ZenAppState.SharedSpace to Mood.Shy,
    ZenAppState.PasswordScreen to Mood.Suspicious,
    ZenAppState.WrongPassword to Mood.Sad,
    ZenAppState.LettingGo to Mood.Scared,
    ZenAppState.AiUnreachable to Mood.Angry, // "Ollama is down" on the web; "AI unreachable" here
    ZenAppState.BoardTightened to Mood.Unimpressed,
)
