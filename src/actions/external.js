import fs from 'fs';
import { exec, spawnSync } from 'child_process';
import { getConfigArg } from './config.js';

export const generateDevManifest = () => {
    exec(`composer exec zest generate-dev-manifest ${getConfigArg()}`);
}

export const generateBuildManifest = () => {
    exec(`composer exec zest generate-build-manifest ${getConfigArg()}`);
}

export const rebuild = () => {
    console.log(`\n`);
    spawnSync('composer', ['exec', 'zest', 'build', getConfigArg()], { stdio: 'inherit' });
    console.log(`\n`);
}

export const findComposerJson = (dir) => {
    let i = 0;
    let appPath = null;

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
