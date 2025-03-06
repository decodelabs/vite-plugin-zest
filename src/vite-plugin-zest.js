import path from 'path';
import fs from 'fs';
import { exec, spawnSync } from 'child_process';

export default (options) => {
    const prepareValue = (value, defaultValue) => {
        if (value === undefined) {
            if (defaultValue === undefined) {
                return 'null';
            }

            return prepareValue(defaultValue);
        }

        if (typeof value === 'string') {
            return `'${value}'`;
        }

        if (typeof value === 'object') {
            return `[${Object.entries(value).map(([key, value]) => `'${key}' => ${prepareValue(value)}`).join(', ')}]`;
        }

        return value;
    };

    const prepareAliases = (value, root) => {
        return `[${Object.entries(value).map(([key, value]) => `'${key}' => ${prepareValue(value.replace(root, '.'))}`).join(', ')}]`;
    };

    const getConfigArg = () => {
        const matches = buildConfig.configFile.match(/\/vite\.([a-zA-Z0-9-_]+)\.config\.js$/);

        if (matches === null) {
            return '';
        }

        return matches[1];
    };

    let configData = {};
    let buildConfig = {};

    return {
        config: (config) => {
            const aliases = {};
            const dirname = process.cwd();

            for (let [alias, aliasPath] of Object.entries(config.resolve?.alias ?? {})) {
                if (aliasPath.startsWith('.')) {
                    aliasPath = path.resolve(dirname, aliasPath);
                }

                aliases[alias] = aliasPath;
            }

            config.resolve.alias = aliases;

            configData.host = config.server?.host;
            configData.port = config.server?.port;
            configData.https = config.server?.https;
            configData.outDir = config.build?.outDir;
            configData.assetsDir = config.build?.assetsDir;
            configData.publicDir = config.build?.publicDir;
            configData.aliases = config.resolve?.alias;
            configData.urlPrefix = config.base;
            configData.entry = config.build?.rollupOptions?.input;
            configData.manifestName = typeof config.build?.manifest === 'string' ? config.build.manifest : undefined;

            if (!config.build?.manifest) {
                config.build.manifest = true;
            }

            if (config.build?.copyPublicDir !== true) {
                config.build.copyPublicDir = false;
            }

            buildConfig = config;

            return config;
        },

        configResolved: (config) => {
            buildConfig.configFile = config.configFile;


            if (configData.port === undefined) {
                configData.port = config.server.port;
            }

            const phpConfig = `
<?php
use DecodeLabs\\Zest\\Config\\Generic as Config;
return new Config(
    path: __DIR__,
    host: ${prepareValue(configData.host ?? undefined)},
    port: ${prepareValue(configData.port ?? undefined)},
    https: ${prepareValue(configData.https ?? undefined)},
    outDir: ${prepareValue(configData.outDir ?? undefined, 'dist')},
    assetsDir: ${prepareValue(configData.assetsDir ?? undefined, 'assets')},
    publicDir: ${prepareValue(configData.publicDir ?? undefined, 'public')},
    aliases: ${prepareAliases(configData.aliases ?? {}, config.root)},
    urlPrefix: ${prepareValue(configData.urlPrefix ?? undefined)},
    entry: ${prepareValue(configData.entry ?? undefined)},
    manifestName: ${prepareValue(configData.manifestName, 'manifest.json')},
);
`;

            const filename = config.configFile.replace(/\.js$/, '.php');
            fs.writeFileSync(filename, phpConfig.trimStart());
        },

        buildStart() {
            if (process.env.NODE_ENV === 'development') {
                exec(`composer exec zest generate-dev-manifest ${getConfigArg()}`);
            }
        },

        async buildEnd() {
            if (
                process.env.NODE_ENV === 'development' &&
                (options.buildOnExit ?? true)
            ) {
                process.env.NODE_ENV = 'production';
                console.log(`\n`);
                spawnSync('composer', ['exec', 'zest', 'build', getConfigArg()], { stdio: 'inherit' });
                console.log(`\n`);
            }
        },

        closeBundle() {
            exec(`composer exec zest generate-build-manifest ${getConfigArg()}`);
        }
    }
};
