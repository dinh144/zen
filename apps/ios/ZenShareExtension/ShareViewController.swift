import Social

// Placeholder for the share-extension ticket (spec stories 43-48). Scaffold only: it must
// build and embed in the app's PlugIns, in the shared App Group — the capture pipeline
// (any kind, offline queue) arrives with that ticket.
final class ShareViewController: SLComposeServiceViewController {
    override func isContentValid() -> Bool { true }

    override func didSelectPost() {
        extensionContext?.completeRequest(returningItems: nil)
    }

    override func configurationItems() -> [Any]! { [] }
}
