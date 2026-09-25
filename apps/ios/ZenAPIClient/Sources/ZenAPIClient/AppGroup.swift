// The App Group every zen target (app, share extension, widget extension, watch app, watch
// complication) shares — it holds the local database and upload queue, so every entry point
// writes to the same queue (spec `.scratch/zen-ios/spec.md`, "Targets"). Must match the
// `com.apple.security.application-groups` entitlement generated for each target in project.yml.
public let appGroupID = "group.com.dinh144.zen"
