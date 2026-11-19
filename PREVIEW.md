# Website redesign preview

The user requires a chance to test and approve the dedicated-book-page redesign before the live website is changed.

- Live website: https://kidderminsterpress.com/
- Live source branch: `main`
- Review branch: `redesign-preview`
- Private review website: https://kidderminster-press-preview.harperjack124.chatgpt.site
- Private Site project ID: `appgprj_6afe40d275c081918836aaeca1cbf7a6`
- Initial live baseline: `1f93ed1479bbba191beb0a30db7791bd6d400288`

The review website currently contains an isolated copy of the existing site. The dedicated book pages have not been built yet. Develop and publish the redesign to that private Site for review. Its source repository and hosting configuration are managed independently from the live GitHub Pages website.

Test downloads use copies hosted on the preview. Mailing-list forms show a local test confirmation without adding subscribers. Print product information can display, but purchasing controls are disabled. The preview is owner-only and marked against search indexing.

Do not push or merge changes into `main`, alter GitHub Pages settings, or change domain/DNS while working on the preview. A request to update the preview is not launch approval. After the user explicitly approves launch, port the approved website changes to this review branch and merge those changes into `main`. Keep preview hosting identity and test-only protections out of the public build.
