import {
    type AliasOptions,
    type UserConfig
} from 'vite';

import path from 'path';
import fs from 'fs';
import { findComposerJson } from './external.js';

type BuildConfig = UserConfig & {
    configFile?: string;
}

export const buildConfig: BuildConfig = {};

export const normalizeConfig = (
    config: UserConfig
) => {
    config.build = config.build ?? {};
    config.server = config.server ?? {};
    config.resolve = config.resolve ?? {};
    config.resolve.alias = normalizeAliases(config.resolve?.alias);

    if (!config.server?.port) {
        config.server.port = randomPort();
    }

    if (!config.build?.manifest) {
        config.build.manifest = true;
    }

    if (config.build?.copyPublicDir !== true) {
        config.build.copyPublicDir = false;
    }

    return config;
};


export const normalizeAliases = (
    configAliases: AliasOptions | undefined
) => {
    const dirname = process.cwd();
    const aliases = {};

    for (let [alias, aliasPath] of Object.entries(configAliases ?? {})) {
        if (aliasPath.startsWith('.')) {
            aliasPath = path.resolve(dirname, aliasPath);
        }

        aliases[alias] = aliasPath;
    }

    return aliases;
};

export const setBuildConfig = (
    config: UserConfig
) => {
    for (const [key, value] of Object.entries(config)) {
        buildConfig[key] = value;
    }
};

export const setBuildConfigValue = (
    key: string,
    value: any
) => {
    buildConfig[key] = value;
};

export const getConfigArg = () => {
    const matches = buildConfig.configFile?.match(/\/vite\.([a-zA-Z0-9-_]+)\.config\.js$/);

    if (!matches) {
        return '';
    }

    return matches[1];
};


type ZestConfig = {
    host?: string;
    port?: number;
    https?: boolean;
    outDir?: string;
    assetsDir?: string;
    publicDir?: string;
    aliases?: AliasOptions;
    urlPrefix?: string;
    entry?: string;
    manifestName?: string;
};

const zestConfig: ZestConfig = {};

export const createZestConfig = (config) => {
    // Create config data
    zestConfig.host = config.server?.host;
    zestConfig.port = config.server?.port;
    zestConfig.https = config.server?.https;
    zestConfig.outDir = config.build?.outDir;
    zestConfig.assetsDir = config.build?.assetsDir;
    zestConfig.publicDir = config.build?.publicDir;
    zestConfig.aliases = config.resolve?.alias;
    zestConfig.urlPrefix = config.base;
    zestConfig.entry = config.build?.rollupOptions?.input;
    zestConfig.manifestName = typeof config.build?.manifest === 'string' ? config.build.manifest : undefined;
};


export const writeZestConfig = (
    root: string,
    configFile: string
): void => {
    const dirname = process.cwd();
    const appPath = findComposerJson(dirname);

    if (appPath === null) {
        console.warn('composer.json not found in local filesystem tree');
        return;
    }

    const filename = path.basename(configFile).replace(/\.js$/, '.php');
    const relPath = path.relative(appPath, dirname);

    const phpConfig = `
<?php
use DecodeLabs\\Zest\\Config\\Generic as Config;
return new Config(
    path: ${prepareValue(relPath)},
    host: ${prepareValue(zestConfig.host ?? undefined)},
    port: ${prepareValue(zestConfig.port ?? undefined)},
    https: ${prepareValue(zestConfig.https ?? undefined)},
    outDir: ${prepareValue(zestConfig.outDir ?? undefined, 'dist')},
    assetsDir: ${prepareValue(zestConfig.assetsDir ?? undefined, 'assets')},
    publicDir: ${prepareValue(zestConfig.publicDir ?? undefined, 'public')},
    aliases: ${prepareAliases(zestConfig.aliases ?? {}, root)},
    urlPrefix: ${prepareValue(zestConfig.urlPrefix ?? undefined)},
    entry: ${prepareValue(zestConfig.entry ?? undefined)},
    manifestName: ${prepareValue(zestConfig.manifestName, 'manifest.json')},
);
`;

    if (!fs.existsSync(`${appPath}/.iota/zest`)) {
        fs.mkdirSync(`${appPath}/.iota/zest`, { recursive: true });
    }

    fs.writeFileSync(`${appPath}/.iota/zest/${filename}`, phpConfig.trimStart());
};


export const prepareValue = (
    value: any,
    defaultValue: any | undefined = undefined) => {
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

export const prepareAliases = (
    value: AliasOptions,
    root: string
): string => {
    return `[${Object.entries(value).map(([key, value]) => `'${key}' => ${prepareValue(value.replace(root, '.'))}`).join(', ')}]`;
};


let virtualBase: string = '/';

export const setVirtualBase = (
    base: string
): void => {
    virtualBase = base;
};

export const getVirtualBase = (): string => {
    return virtualBase;
};

export const randomPort = (): number => {
    return Math.floor(Math.random() * (65535 - 1024 + 1)) + 1024;
};
