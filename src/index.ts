import {
    type ConfigEnv,
    type Plugin,
    type UserConfig,
    type ViteDevServer
} from 'vite';

import {
    normalizeConfig,
    setBuildConfig,
    setBuildConfigValue,
    createZestConfig,
    writeZestConfig
} from './actions/config';

import {
    generateDevManifest,
    generateBuildManifest,
    rebuild,
} from './actions/external';

import {
    prepareConfig as mergeToPublicPrepareConfig,
    modifyPublicAssetUrl as mergeToPublicModifyPublicAssetUrl,
    modifyProcessedAssetUrl as mergeToPublicModifyProcessedAssetUrl,
    injectModulePreload
} from './actions/merge-to-public';

import {
    modifyPublicAssetUrl as publicCacheBusterModifyPublicAssetUrl
} from './actions/public-cache-buster';

export default (options): Plugin => {
    let base, server;
    let command: 'serve' | 'build' | undefined;

    return {
        name: 'vite:zest',

        config: (
            config: UserConfig,
            env: ConfigEnv
        ) => {
            command = env.command;
            config = normalizeConfig(config);

            if (options.mergeToPublicDir) {
                config = mergeToPublicPrepareConfig(config);
            }

            createZestConfig(config);
            setBuildConfig(config);
            return config;
        },

        configResolved: (config) => {
            base = config.base;
            setBuildConfigValue('configFile', config.configFile);
            writeZestConfig(config.root, config.configFile as string);
        },

        configureServer(
            _server: ViteDevServer
        ) {
            server = _server;
        },

        transform(code, id) {
            if (
                id.endsWith('.css') ||
                id.endsWith('.scss') ||
                id.endsWith('.sass') ||
                id.endsWith('.less')
            ) {
                code = code.replace(/url\("([^)]+)"\)/g, (match, url) => {
                    if (url.startsWith('__VITE_PUBLIC_ASSET_')) {
                        // Add a leading slash to the URL if base is a relative path
                        if (options.mergeToPublicDir) {
                            url = mergeToPublicModifyPublicAssetUrl(base, url);
                        }

                        // Add public cache buster
                        if (options.publicCacheBuster) {
                            url = publicCacheBusterModifyPublicAssetUrl(url);
                        }
                    } else if (url.startsWith('__VITE_ASSET_')) {
                        // Make absolute assets relative to the base
                        if (options.mergeToPublicDir) {
                            url = mergeToPublicModifyProcessedAssetUrl(base, url);
                        }
                    }

                    return `url("${url}")`;
                });

                return { code };
            }
        },


        generateBundle(bundleOptions, bundle) {
            for (const [fileName, chunk] of Object.entries(bundle)) {
                if (
                    options.mergeToPublicDir &&
                    chunk.type === 'chunk'
                ) {
                    chunk.code = injectModulePreload(chunk.code);
                }
            }
        },

        buildStart() {
            if (command === 'serve') {
                generateDevManifest();
            }
        },

        async buildEnd() {
            if (
                command === 'serve' &&
                options.buildOnExit &&
                !server?._restartPromise
            ) {
                rebuild();
            }
        },

        closeBundle() {
            if (command === 'build') {
                generateBuildManifest();
            }
        }
    }
};
