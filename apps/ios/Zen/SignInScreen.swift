import SwiftUI

// Placeholder for the sign-in ticket (spec stories 1-9). This scaffold only needs a real,
// findable screen for the Maestro smoke flow (flows/smoke.yaml) — the sumi-e look comes with
// the design system ticket. Mirrors apps/android's SignInScreen.kt scaffold.
struct SignInScreen: View {
    var body: some View {
        ZStack {
            Color.white.ignoresSafeArea()
            Text(String(localized: "login_google"))
                .accessibilityIdentifier("signin.google")
                .padding()
        }
        .accessibilityIdentifier("signin.screen")
    }
}
