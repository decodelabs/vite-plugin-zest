import {
    getVirtualBase,
    setVirtualBase
} from './config.js';

export const prepareConfig = (config) => {
    // Normalize outDir
    const publicDir = config.build.publicDir ?? 'public';
    const assetsDir = config.build.assetsDir ?? 'assets';
    const vOutDir = `${assetsDir}/${config.build.outDir ?? 'zest'}`;

    config.build.outDir = `${publicDir}/${vOutDir}`;
    config.build.assetsDir = '.';

    // Normalize base
    if (!config.base) {
        config.base = '/';
    }

    if (
        !config.base.startsWith('/') &&
        !config.base.startsWith('.')
    ) {
        config.base = `/${config.base}`;
    }

    if (!config.base.endsWith('/')) {
        config.base += '/';
    }

    setVirtualBase(`${config.base}${vOutDir}`);

    // Ensure origin is set
    if (!config.server?.origin) {
        let origin = 'http';

        if (config.server?.https) {
            origin += 's';
        }

        origin += '://';

        if (config.server?.host) {
            origin += config.server.host;
        } else {
            origin += 'localhost';
        }

        origin += `:${config.server.port}`;
        config.server.origin = origin;
    }

    return config;
};


export const modifyPublicAssetUrl = (base, url) => {
    if (base.startsWith('.')) {
        url = `/${url}`;
    }

    return url;
};

export const modifyProcessedAssetUrl = (base, url) => {
    if (base.startsWith('/')) {
        url = `.${url}`;
    }

    return url;
};


export const injectModulePreload = (code) => {
    if (!code) {
        return code;
    }

    return code.replace(/const ([^=]+)="modulepreload",([^=]+)=function\(([^)]+)\){return"\/"\+([^}]+)}/, (match, M, R, e, f) => {
        return `const ${M}="modulepreload",${R}=function(${e}){return"${getVirtualBase()}/"+${f}}`;
    });
}
