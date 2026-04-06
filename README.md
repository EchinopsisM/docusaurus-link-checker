# Docusaurus Link Checker

A Python link checker for [Docusaurus](https://docusaurus.io/) sites. Checks internal links against your local build output and optionally checks all external URLs with real HTTP requests.

## Features

- **Local mode** — scans your source docs and build output
  - Verifies internal links exist in the Docusaurus build (no slug inference — trusts only what Docusaurus actually produces)
  - Checks anchors against rendered HTML IDs
  - Checks all external URLs (HEAD/GET with redirect handling)
  - Skips links inside HTML comments and code blocks
  - Prompts before overwriting an existing build; warns if the build is outdated
- **Live mode** — crawls your deployed site via its sitemap and checks every link found
- Generates two reports in `link-reports/`:
  - `dead_links_report.md` — detailed machine-friendly report
  - `dead_links_audit.md` — human-readable audit with priority list

## Requirements

- Python 3.8+
- Your Docusaurus project (for local mode, `npm` must be available)

No third-party Python packages required — uses only the standard library.

## Setup

Clone this repo alongside your Docusaurus project, or copy the two scripts directly into your project:

```bash
git clone https://github.com/NoahMaizels/docusaurus-link-checker.git
```

Or add it as a npm script in your `package.json`:

```json
"scripts": {
  "check:links": "python /path/to/check_links.py"
}
```

## Usage

Run from your **Docusaurus project root**:

```bash
cd /path/to/your-docs-project
python /path/to/check_links.py
```

You will be prompted to choose local or live mode.

### Options

```
python check_links.py [--mode local|live] [--site-domain your-site.com]
                      [--no-external] [--threads N]
```

| Flag | Description |
|---|---|
| `--mode local` | Check local build + source docs (default) |
| `--mode live` | Crawl the live site |
| `--site-domain` | Your site's domain, e.g. `docs.mysite.com`. Auto-detected from `docusaurus.config.*` if omitted. Used to check self-referential links against the local build. |
| `--no-external` | Skip external URL checking (local mode only) |
| `--threads N` | Number of concurrent HTTP threads (default: 8) |

### Local mode example

```bash
cd ~/my-docs
python ~/docusaurus-link-checker/check_links.py --mode local --site-domain docs.mysite.com
```

The script will:
1. Check if your `build/` directory exists and is up to date
2. Offer to run `npm run build` if needed
3. Scan all `.md`/`.mdx` files in `docs/`
4. Check all external URLs concurrently
5. Scan the build output HTML for broken internal links
6. Write reports to `link-reports/`

### Live mode example

```bash
python ~/docusaurus-link-checker/check_links.py --mode live --site-domain docs.mysite.com
```

Fetches `https://docs.mysite.com/sitemap.xml`, crawls every page, and checks all links found.

## Output

Reports are written to `link-reports/` in your project root (auto-created, add to `.gitignore`):

```
link-reports/
  dead_links_report.md   # detailed report with all categories
  dead_links_audit.md    # human-readable audit with priority list
```

### Report sections

- **Broken internal links** — source doc links that don't resolve in the build
- **External 404s** — URLs returning HTTP 404
- **Down / refused** — DNS failures, timeouts, SSL errors
- **Stale redirects** — URLs that redirect to a different final URL
- **Check errors** — timeouts or other failures (verify manually)
- **Build HTML broken links** — links broken in the rendered output

## Notes

- Anchors on JS-rendered pages (e.g. `/api/`) are skipped since their IDs aren't in static HTML
- Links inside HTML comments and code blocks are ignored
- Localhost and private IP addresses are always skipped
- The `link-reports/` directory should be added to `.gitignore`
