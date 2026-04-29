import fs from 'fs';
import { spawnSync } from 'child_process';
import { getConfigArg } from './config.js';

const runComposer = (...args: Array<string | undefined>) => {
    const command = ['exec', 'zest', ...args.filter(Boolean)];
    const result = spawnSync('composer', command, { stdio: 'inherit' });

    if (result.status !== 0) {
        throw new Error(`composer ${command.join(' ')} failed`);
    }
};

export const generateDevManifest = () => {
    runComposer('generate-dev-manifest', getConfigArg());
}

export const generateBuildManifest = () => {
    runComposer('generate-build-manifest', getConfigArg());
}

export const rebuild = () => {
    console.log(`\n`);
    runComposer('build', getConfigArg());
    console.log(`\n`);
}

export const findComposerJson = (
    dir: string
): string | null => {
    let i = 0;
    let appPath: string | null = null;

    while (i < 3) {
        const path = `${dir}/composer.json`;

        if (fs.existsSync(path)) {
            appPath = dir;
            break;
        }

        dir = path.split('/').slice(0, -1).join('/');

        if (dir === '') {
            break;
        }

        i++;
    }

    return appPath;
};
