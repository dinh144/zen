plugins {
    // AGP 9's built-in Kotlin support covers :app and :wear — no separate
    // org.jetbrains.kotlin.android plugin (https://kotl.in/gradle/agp-built-in-kotlin).
    id("com.android.application") version "9.4.1" apply false
    id("org.jetbrains.kotlin.jvm") version "2.4.20" apply false
    id("org.jetbrains.kotlin.plugin.compose") version "2.4.20" apply false
    id("org.openapi.generator") version "7.14.0" apply false
}

// Regenerates Android string resources for all five locales from the web's language source
// (apps/web/lib/i18n.ts) — see scripts/generate-android-strings.ts. :app and :wear both
// depend on this via their preBuild task (see their build.gradle.kts), and Gradle skips
// re-running it when i18n.ts hasn't changed.
tasks.register<Exec>("generateStrings") {
    val repoRoot = rootProject.projectDir.resolve("../..")
    workingDir = repoRoot
    inputs.file(repoRoot.resolve("apps/web/lib/i18n.ts"))
    outputs.dir(rootProject.layout.buildDirectory.dir("generated-strings"))
    commandLine("bun", "scripts/generate-android-strings.ts")
}
