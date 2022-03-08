/* eslint-disable node/no-unpublished-require */
const {exec} = require('child_process');
const {series} = require('gulp');
const del = require('del');
const gulp = require('gulp');
const hb = require('gulp-hb');
const util = require('util');
const execAsync = util.promisify(exec);

const cloneToDist = async () => {
    return new Promise(resolve => {
        gulp.src(['.*', '.*/**/*', '**/*', '!node_modules', '!node_modules/**/*', '!.git', '!.git/**/*', '!package.json', '!package-lock.json'])
            .pipe(hb().data({projectName: 'InceptionWIP', repositoryName: 'soundplus-wt-new-pipeline-test'}))
            .pipe(gulp.dest('dist'))
            .on('end', () => {
                resolve();
            });
    });
};
cloneToDist.description = 'Copies the project to the dist dir setting variables within the templates';

const makeNewPackageJson = async () => {
    await shell('mv ./package-template.json ./package.json', './dist');
};
makeNewPackageJson.description = 'Clones the templated package.json';

const shell = async (command, dir) => {
    const curDir = process.cwd();
    if (dir) {
        process.chdir(dir);
        console.log(`cwd = ${process.cwd()}`);
    }

    const {stdout, stderr} = await execAsync(command);

    if (stderr) console.error(stderr);
    console.log(stdout);
    if (dir) {
        process.chdir(curDir);
        console.log(`cwd = ${process.cwd()}`);
    }
};

const chmod = () => shell('chmod +x ./init-repo.sh', './dist');
const cat = () => shell('cat init-repo.sh', './dist');
const initRepo = () => shell('./init-repo.sh', './dist');

const clean = async cb => {
    await del(['dist']);
    cb();
};
clean.description = 'Cleans outputs from the build task';

const tsc = async () => {
    await shell('tsc -b');
};
tsc.description = 'Typescript compilation task';

const cdkDeploy = async () => {
    await shell('cdk deploy', './dist');
};
tsc.description = 'cdk deploy task';

const cdkSynth = async () => {
    await shell('cdk synth', './dist');
};
tsc.description = 'cdk synthesize task';

exports.tsc = tsc;
exports.clean = clean;
exports.cloneToDist = cloneToDist;
exports.makeNewPackageJson = makeNewPackageJson;
exports.default = series(clean, cloneToDist, makeNewPackageJson, chmod, initRepo, cdkSynth, cdkDeploy);
