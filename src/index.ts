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

export type PluginOptions = {
    buildOnExit?: boolean;
    mergeToPublicDir?: boolean;
    publicCacheBuster?: boolean;
    legacyMountDev?: boolean;
};

const isStyleRequest = (
    url: string | undefined
): boolean => {
    const path = url?.split('?', 1)[0] ?? '';

    return (
        path.endsWith('.css') ||
        path.endsWith('.scss') ||
        path.endsWith('.sass') ||
        path.endsWith('.less')
    );
};

const invalidateClientModules = (
    server: ViteDevServer
): void => {
    const legacyServer = server as ViteDevServer & {
        moduleGraph?: {
            invalidateAll(): void;
        };
    };

    const modernServer = server as ViteDevServer & {
        environments?: {
            client?: {
                moduleGraph?: {
                    invalidateAll(): void;
                };
            };
        };
    };

    const modernModuleGraph = modernServer.environments?.client?.moduleGraph;

    if (modernModuleGraph) {
        modernModuleGraph.invalidateAll();
        return;
    }

    legacyServer.moduleGraph?.invalidateAll();
};

export default (options: PluginOptions = {}): Plugin => {
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

            if (
                env.command === 'serve' &&
                options.legacyMountDev
            ) {
                config.server ??= {};
                config.server.watch = null;
            }

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

            if (options.legacyMountDev) {
                server.middlewares.use((req, _res, next) => {
                    if (isStyleRequest(req.url)) {
                        delete req.headers['if-none-match'];
                        delete req.headers['if-modified-since'];
                        invalidateClientModules(server as ViteDevServer);
                    }

                    next();
                });
            }
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
