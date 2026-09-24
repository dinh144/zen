plugins {
    id("org.jetbrains.kotlin.jvm")
    id("org.openapi.generator")
}

// Generated from the committed zen API contract (apps/web/openapi.json). Regenerated whenever
// that file changes — openApiGenerate's inputs/outputs make Gradle track it like any other task.
openApiGenerate {
    generatorName.set("kotlin")
    inputSpec.set(rootProject.projectDir.resolve("../web/openapi.json").path)
    outputDir.set(layout.buildDirectory.dir("generated").get().asFile.path)
    apiPackage.set("com.dinh144.zen.client.api")
    modelPackage.set("com.dinh144.zen.client.model")
    invokerPackage.set("com.dinh144.zen.client.invoker")
    configOptions.set(
        mapOf(
            "library" to "jvm-okhttp4",
            "useCoroutines" to "true",
            "dateLibrary" to "java8",
        )
    )
}

kotlin {
    jvmToolchain(17)
    sourceSets.main {
        kotlin.srcDir(layout.buildDirectory.dir("generated/src/main/kotlin"))
    }
}

tasks.named("compileKotlin") {
    dependsOn("openApiGenerate")
}

tasks.named("openApiGenerate") {
    doLast {
        // ponytail: openapi-generator's kotlin generator mis-renders a `boolean` schema with
        // `const: true` (zen's `{ ok: true }` responses) as the string "true" where a
        // kotlin.Boolean literal is required — a compile error. Fixed upstream, milestoned for
        // 7.24.0, not yet released (we're on 7.14.0, the latest on Maven Central as of writing).
        // Drop this patch once the plugin version here is bumped past that fix.
        fileTree(layout.buildDirectory.dir("generated/src/main/kotlin").get().asFile) {
            include("**/*.kt")
        }.forEach { file ->
            val original = file.readText()
            val patched = original.replace("`true`(\"true\")", "`true`(true)").replace("`false`(\"false\")", "`false`(false)")
            if (patched != original) file.writeText(patched)
        }
    }
}

dependencies {
    implementation("com.squareup.okhttp3:okhttp:5.5.0")
    implementation("com.squareup.moshi:moshi-kotlin:1.15.2")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-core:1.11.0")
}
