# Deployment

GitHub Pages is served from the `Verify and deploy` workflow (`.github/workflows/ci.yml`). Pushes to `main` run `npm ci → npm run verify → npm run test:e2e`; only a verified `dist/` is uploaded and deployed.

- Pages source: GitHub Actions (`build_type=workflow`), enabled with `gh api -X POST repos/HyangDan2/AGPilot0001/pages -f build_type=workflow`.
- URL: https://hyangdan2.github.io/AGPilot0001/
- Vite `base: "./"` keeps all asset URLs relative to the sub-path.
- Hosted acceptance: `E2E_URL=https://hyangdan2.github.io/AGPilot0001/ npm run test:e2e`. Record the deployed commit SHA in QA.md.
