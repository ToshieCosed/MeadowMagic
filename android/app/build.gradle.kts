plugins { id("com.android.application") }

android {
    namespace = "app.strata"
    compileSdk = 34
    defaultConfig {
        applicationId = "app.strata.game"
        minSdk = 26
        targetSdk = 34
        versionCode = (System.getenv("GITHUB_RUN_NUMBER") ?: "1").toInt()
        versionName = "0." + (System.getenv("GITHUB_RUN_NUMBER") ?: "1") + ".0"
    }
    signingConfigs {
        // committed sideload key so every build installs over the previous one (not a store key)
        create("sideload") { storeFile = file("../strata.jks"); storePassword = "strata-sideload"; keyAlias = "strata"; keyPassword = "strata-sideload" }
    }
    buildTypes { release { signingConfig = signingConfigs.getByName("sideload"); isMinifyEnabled = false } }
    compileOptions { sourceCompatibility = JavaVersion.VERSION_17; targetCompatibility = JavaVersion.VERSION_17 }
}

val syncWeb by tasks.registering(Copy::class) {
    from("../../release/strata-standalone.html") { rename { "strata.html" } }
    into(layout.buildDirectory.dir("generated/web"))
}
android.sourceSets.getByName("main").assets.srcDir(layout.buildDirectory.dir("generated/web"))
tasks.named("preBuild") { dependsOn(syncWeb) }
