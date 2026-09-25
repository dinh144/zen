package com.dinh144.zen.design

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Test

// Story 195/200 + DESIGN.md's Visual decisions ("Sixteen moods, each bound to a real
// state"): every app state names a mood, and every mood is reachable from some state.
class MoodTest {
    @Test
    fun `every app state maps to a mood`() {
        ZenAppState.entries.forEach { state -> assertNotNull(MOOD_FOR_STATE[state]) }
    }

    @Test
    fun `every one of the sixteen moods is reachable from at least one state`() {
        assertEquals(Mood.entries.toSet(), MOOD_FOR_STATE.values.toSet())
    }

    @Test
    fun `sleepy covers drift and a card still settling, per DESIGN dot md`() {
        assertEquals(Mood.Sleepy, MOOD_FOR_STATE[ZenAppState.Drifting])
        assertEquals(Mood.Sleepy, MOOD_FOR_STATE[ZenAppState.CardSettling])
    }

    @Test
    fun `the mapping is deterministic — same state, same mood, every call`() {
        ZenAppState.entries.forEach { state -> assertEquals(MOOD_FOR_STATE[state], MOOD_FOR_STATE[state]) }
    }
}
