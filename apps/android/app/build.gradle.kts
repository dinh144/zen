plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.plugin.compose")
}

val generatedStringsDir = rootProject.layout.buildDirectory.dir("generated-strings").get().asFile

android {
    namespace = "com.dinh144.zen"
    compileSdk = 37

    defaultConfig {
        applicationId = "com.dinh144.zen"
        minSdk = 31
        targetSdk = 37
        versionCode = 1
        versionName = "0.1.0"
    }

    buildFeatures {
        compose = true
        buildConfig = true // BuildConfig.DEBUG gates the design sampler screen to debug builds
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    sourceSets.getByName("main") {
        res.srcDir(generatedStringsDir)
    }
}

kotlin {
    jvmToolchain(17)
}

tasks.named("preBuild") {
    dependsOn(rootProject.tasks.named("generateStrings"))
}

dependencies {
    implementation(project(":client"))

    val composeBom = platform("androidx.compose:compose-bom:2026.09.00")
    implementation(composeBom)
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.foundation:foundation")
    implementation("androidx.compose.animation:animation")
    implementation("androidx.activity:activity-compose:1.13.0")
    // Zen Old Mincho / Zen Kaku Gothic New / Noto (vi/ko/zh) through Android's Downloadable
    // Fonts — the platform's own "fetch once, cache" mechanism, matching next/font/google on
    // the web without committing font binaries to this repo. Not covered by the compose BOM;
    // pinned to the latest stable release on Google's Maven as of this ticket.
    implementation("androidx.compose.ui:ui-text-google-fonts:1.12.1")

    testImplementation("junit:junit:4.13.2")
}
