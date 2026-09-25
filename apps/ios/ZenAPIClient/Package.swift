// swift-tools-version: 6.0
import PackageDescription

// The Swift client, generated at build time by the OpenAPIGenerator plugin from the committed
// zen API contract (Sources/ZenAPIClient/openapi.json, a symlink to apps/web/openapi.json — one
// document, no copy to drift). Mirrors apps/android/client's role (openapi-generator, kotlin).
let package = Package(
    name: "ZenAPIClient",
    // macOS listed only because `swift test` runs the package's own host (macOS) build —
    // OpenAPIRuntime/OpenAPIURLSession require macOS 10.15+. The Zen app target sets the real
    // iOS minimum (project.yml's `deploymentTarget`).
    platforms: [.iOS(.v17), .macOS(.v13)],
    products: [
        .library(name: "ZenAPIClient", targets: ["ZenAPIClient"])
    ],
    dependencies: [
        .package(url: "https://github.com/apple/swift-openapi-generator", from: "1.6.0"),
        .package(url: "https://github.com/apple/swift-openapi-runtime", from: "1.6.0"),
        .package(url: "https://github.com/apple/swift-openapi-urlsession", from: "1.0.0"),
    ],
    targets: [
        .target(
            name: "ZenAPIClient",
            dependencies: [
                .product(name: "OpenAPIRuntime", package: "swift-openapi-runtime"),
                .product(name: "OpenAPIURLSession", package: "swift-openapi-urlsession"),
            ],
            plugins: [
                .plugin(name: "OpenAPIGenerator", package: "swift-openapi-generator")
            ]
        ),
        .testTarget(
            name: "ZenAPIClientTests",
            dependencies: ["ZenAPIClient"]
        ),
    ]
)
