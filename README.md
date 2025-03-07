# Zest Vite Plugin

## Usage

This plugin creates PHP config and manifest files that the main <code>Zest</code> library can consume.
Ensure this plugin is installed in your Zest/Vite project to enable front end integration works as expected.

```bash
npm install -D @decodelabs/vite-plugin-zest
```

Apply the plugin using the usual Vite plugin configuration - use the <code>buildOnExit</code> option to trigger a Zest build when Vite dev server exits.

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

### Merge to public dir

If you are using Zest in a standard server environment project which uses the contents of the git repository as the source of truth without a build step, you can merge the Zest build output into the public directory.

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

This will alter your config to the following, making for a much cleaner and simpler distribution model:

```javascript
{
  outDir: `${publicDir}/${assetsDir}/${outDir}`,
  assetsDir: '.'
}
