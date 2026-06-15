# Zest vite plugin — Package Specification

> **Cluster:** `frontend`
> **Language:** `typescript`
> **Milestone:** `m4`
> **Repo:** `https://github.com/decodelabs/vite-plugin-zest`
> **Role:** Vite config for Zest

## Overview

### Purpose

The Zest Vite plugin creates PHP config and manifest files that the main Zest library can consume. It enables seamless integration between Vite's build process and PHP applications by generating PHP-friendly configuration files and manifests.

Key features:
- **PHP config generation**: Generates PHP configuration files from Vite config
- **Manifest generation**: Generates dev and production manifests for PHP consumption
- **Build on exit**: Optionally triggers production build when dev server exits
- **Merge to public**: Option to merge build output into public directory
- **Public cache busting**: Adds cache-busting query parameters to public asset URLs
- **Legacy mounted dev mode**: Disables Vite file watching for slow mounted
  legacy projects and refreshes CSS transforms on request
- **URL normalization**: Handles URL normalization for merged builds
- **Module preload injection**: Injects module preload paths for dynamic imports

### Non-Goals

- The plugin does not provide Vite itself (requires Vite as peer dependency).
- It does not handle PHP-side asset serving (handled by Zest library).
- It does not provide view adapters (handled by Zest library).
- It does not handle asset bundling or optimization (delegated to Vite).
- It does not provide hot module replacement (HMR) implementation (handled by Vite).

## Role in the Ecosystem

### Cluster & Positioning

The Zest Vite plugin belongs to the **frontend** cluster, providing the Vite-side integration for the Zest PHP library. It bridges Vite's build process with PHP by generating PHP-consumable configuration and manifest files, enabling seamless asset management in PHP applications.

### Usage Contexts

- **Development**: Generating dev manifests during Vite dev server operation
- **Production**: Generating production manifests and PHP config files during build
- **Build automation**: Triggering production builds when dev server exits
- **Public directory merging**: Merging build output into public directory for server environments
- **Cache busting**: Adding cache-busting parameters to public asset URLs

## Public Surface

### Key Types

- **Plugin function**: Default export function that returns a Vite plugin instance.

- **Plugin options**: Options object with the following properties:
  - `buildOnExit?: boolean` — Trigger production build when dev server exits
  - `mergeToPublicDir?: boolean` — Merge build output into public directory
  - `publicCacheBuster?: boolean` — Add cache-busting query parameters to public asset URLs
  - `legacyMountDev?: boolean` — Disable file watching in dev and refresh CSS
    transforms on request

### Main Entry Points

**Plugin Function:**
- `default(options?: PluginOptions): Plugin` — Create Vite plugin instance

**Plugin Options:**
- `buildOnExit?: boolean` — Trigger production build on dev server exit (default: `false`)
- `mergeToPublicDir?: boolean` — Merge build output into public directory (default: `false`)
- `publicCacheBuster?: boolean` — Add cache-busting to public asset URLs (default: `false`)
- `legacyMountDev?: boolean` — Disable dev file watching and refresh CSS
  transforms on request (default: `false`)

**Plugin Hooks:**
- `config` — Normalize Vite config and prepare Zest config
- `configResolved` — Write PHP config file after config resolution
- `configureServer` — Store server reference for build on exit
- `transform` — Transform CSS files to modify asset URLs
- `generateBundle` — Inject module preload paths in chunks
- `buildStart` — Generate dev manifest
- `buildEnd` — Trigger production build if `buildOnExit` enabled
- `closeBundle` — Generate production manifest

## Dependencies

### Decode Labs

None.

### External

- **Vite**: Peer dependency (^6) — Required for plugin functionality.
- **Node.js**: Required runtime environment.
- **TypeScript**: Used for type definitions (dev dependency).

## Behaviour & Contracts

### Invariants

- PHP config files written to `.iota/zest/` directory relative to `composer.json`.
- Config file name derived from Vite config file name (`.ts`/`.js` → `.php`).
- Dev manifest generated at build start in development mode.
- Production manifest generated at bundle close.
- Build on exit only triggers if dev server not restarting.
- Public cache buster uses timestamp-based version parameter.
- Module preload injection only applies when `mergeToPublicDir` enabled.
- Legacy mounted dev mode only applies during Vite's `serve` command.

### Input & Output Contracts

**Plugin Initialization:**
- Plugin accepts optional options object.
- Options default to `false` if not specified.
- Plugin returns Vite plugin instance with hooks.

**Config Normalization:**
- Vite config normalized with defaults:
  - `build.manifest` defaults to `true` if not specified.
  - `build.copyPublicDir` defaults to `false` if not `true`.
  - `server.port` defaults to random port (1024-65535) if not specified.
  - `resolve.alias` normalized (relative paths resolved to absolute).
- If `mergeToPublicDir` enabled:
  - `build.outDir` set to `${publicDir}/${assetsDir}/${outDir}`.
  - `build.assetsDir` set to `'.'`.
  - `base` normalized (ensured to start and end with `/`).
  - `server.origin` set if not specified.
- If `legacyMountDev` is enabled during `serve`:
  - `server.watch` is set to `null`.
  - CSS-like dev requests clear conditional cache headers.
  - The Vite client module graph is invalidated before CSS-like dev responses.

**PHP Config Generation:**
- PHP config file generated from Vite config.
- Config file written to `.iota/zest/` directory.
- Config file name: `vite.config.php` or `vite.{name}.config.php`.
- Config includes: host, port, https, origin, outDir, assetsDir, publicDir, aliases, urlPrefix, entry, manifestName.
- Aliases normalized (absolute paths converted to relative if within root).

**Manifest Generation:**
- Dev manifest generated via `composer exec zest generate-dev-manifest`.
- Production manifest generated via `composer exec zest generate-build-manifest`.
- Config name passed as argument if multiple configs present.
- Dev-manifest generation keys off Vite's `serve` command, not ambient
  `NODE_ENV`.
- Composer hooks run synchronously and fail loudly if Zest cannot generate the
  manifest.

**Build on Exit:**
- Production build triggered if `buildOnExit` enabled and dev server exiting.
- Build triggered via `composer exec zest build`.
- Build skipped if server restarting.

**Merge to Public:**
- Build output merged into public directory subdirectory.
- Public asset URLs modified to add leading slash if base is relative.
- Processed asset URLs modified to be relative if base is absolute.
- Module preload paths injected with virtual base path.

**Public Cache Busting:**
- Cache-busting query parameter (`?v={timestamp}`) added to public asset URLs in CSS.
- Timestamp generated once per build process.
- Only applies to URLs matching `__VITE_PUBLIC_ASSET_` pattern.

**URL Transformation:**
- CSS files transformed to modify asset URLs.
- Public asset URLs (`__VITE_PUBLIC_ASSET_`) modified based on options.
- Processed asset URLs (`__VITE_ASSET_`) modified if `mergeToPublicDir` enabled.

**Module Preload Injection:**
- Module preload function modified in generated chunks.
- Virtual base path injected into preload URL generation.
- Only applies when `mergeToPublicDir` enabled.

## Error Handling

- **Composer.json not found**: Warning logged, PHP config generation skipped.
- **Config file write failure**: Error thrown by filesystem operations.
- **Manifest generation failure**: Error thrown by Composer execution.
- **Build failure**: Error thrown by Composer execution (build on exit).

## Configuration & Extensibility

### Plugin Options

```typescript
import zest from '@decodelabs/vite-plugin-zest'

export default defineConfig({
  plugins: [
    zest({
      buildOnExit: true,
      mergeToPublicDir: false,
      publicCacheBuster: false
    })
  ],
})
```

### Build on Exit

Enable production build when dev server exits:

```typescript
zest({
  buildOnExit: true
})
```

### Merge to Public Directory

Merge build output into public directory:

```typescript
zest({
  mergeToPublicDir: true
})
```

This alters config to build into `public/{assetsDir}/{outDir}` and normalizes URLs accordingly.

### Public Cache Busting

Add cache-busting query parameters to public asset URLs:

```typescript
zest({
  publicCacheBuster: true
})
```

This appends `?v={timestamp}` to public asset URLs in CSS files.

### Legacy Mounted Dev Mode

Disable Vite file watching for slow mounted legacy source trees:

```typescript
zest({
  legacyMountDev: true
})
```

This mode trades HMR for responsive asset serving. Browser refreshes pick up CSS
changes, but Vite will not watch files for automatic updates.

## Interactions with Other Packages

- **Zest**: Consumes PHP config files and manifests generated by plugin.
- **Vite**: Provides plugin hooks and build process integration.
- **Composer**: Used for executing Zest commands (manifest generation, builds).

## Usage Examples

### Basic Usage

```javascript
import zest from '@decodelabs/vite-plugin-zest'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [
    zest()
  ],
})
```

### Build on Exit

```javascript
import zest from '@decodelabs/vite-plugin-zest'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [
    zest({
      buildOnExit: true
    })
  ],
})
```

### Merge to Public Directory

```javascript
import zest from '@decodelabs/vite-plugin-zest'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [
    zest({
      mergeToPublicDir: true
    })
  ],
})
```

### Public Cache Busting

```javascript
import zest from '@decodelabs/vite-plugin-zest'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [
    zest({
      publicCacheBuster: true
    })
  ],
})
```

### Combined Options

```javascript
import zest from '@decodelabs/vite-plugin-zest'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [
    zest({
      buildOnExit: true,
      mergeToPublicDir: true,
      publicCacheBuster: true
    })
  ],
})
```

## Implementation Notes (for Contributors)

### Plugin Structure

- Plugin implemented as default export function.
- Returns Vite plugin object with hooks.
- Options stored in closure for hook access.

### Config Normalization

- `normalizeConfig()` ensures required config properties exist.
- Defaults applied for missing properties.
- Aliases normalized to absolute paths.

### PHP Config Generation

- `createZestConfig()` extracts config from Vite config.
- `writeZestConfig()` writes PHP config file.
- Config file written to `.iota/zest/` directory.
- File name derived from Vite config file name.

### Manifest Generation

- Dev manifest generated via Composer command at build start.
- Production manifest generated via Composer command at bundle close.
- Config name extracted from config file path.

### Build on Exit

- Server reference stored in `configureServer` hook.
- Production build triggered in `buildEnd` hook if conditions met.
- `NODE_ENV` temporarily set to `production` for build.

### Merge to Public

- Config modified in `config` hook to change output directory.
- Base URL normalized to ensure proper asset resolution.
- Public asset URLs modified in `transform` hook.
- Processed asset URLs modified in `transform` hook.
- Module preload paths injected in `generateBundle` hook.

### Public Cache Busting

- Timestamp generated once per build process.
- Public asset URLs modified in `transform` hook.
- Query parameter appended to matching URLs.

### URL Transformation

- CSS files transformed to modify `url()` references.
- Pattern matching used to identify Vite asset placeholders.
- URLs modified based on options and base configuration.

### Module Preload Injection

- Regular expression used to find module preload function.
- Virtual base path injected into preload URL generation.
- Only applies to chunk files when `mergeToPublicDir` enabled.

## Testing & Quality

**Current Status:**
- Code quality: 4/5
- README quality: 3/5
- Documentation: 0/5 (no formal docs yet)
- Tests: 0/5 (no test suite yet)

**Testing Considerations:**
- Plugin should be tested for:
  - Config normalization (defaults, aliases)
  - PHP config generation (file writing, content)
  - Manifest generation (dev and production)
  - Build on exit (triggering, skipping)
  - Merge to public (config modification, URL transformation)
  - Public cache busting (URL modification)
  - Module preload injection (path injection)
  - URL transformation (CSS asset URLs)
  - Error handling (missing composer.json, file errors)

- Config normalization should be tested for:
  - Default values
  - Alias normalization
  - Port generation
  - Merge to public config modification

- PHP config generation should be tested for:
  - File writing
  - Config content
  - File name derivation
  - Directory creation

- Manifest generation should be tested for:
  - Dev manifest generation
  - Production manifest generation
  - Config name extraction
  - Composer command execution

- Build on exit should be tested for:
  - Triggering conditions
  - Build execution
  - Environment variable handling
  - Server restart detection

- Merge to public should be tested for:
  - Config modification
  - URL transformation
  - Module preload injection
  - Base URL normalization

- Public cache busting should be tested for:
  - URL modification
  - Timestamp generation
  - Pattern matching

## Roadmap & Future Ideas

- **Enhanced error handling**: Better error messages and recovery
- **Config validation**: Validate Vite config before processing
- **Performance optimization**: Optimize config generation and file writing
- **Testing**: Comprehensive test suite
- **Documentation**: Enhanced documentation and examples
- **TypeScript types**: Improved TypeScript type definitions
- **Multiple configs**: Better support for multiple Vite configs
- **Watch mode**: Support for watch mode in build on exit

## References

- Package repository: https://github.com/decodelabs/vite-plugin-zest
- npm package: https://www.npmjs.com/package/@decodelabs/vite-plugin-zest
- Vite documentation: https://vitejs.dev/
- Related packages:
  - Zest: PHP library consuming generated configs and manifests
