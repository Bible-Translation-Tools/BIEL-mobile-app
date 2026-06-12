/**
 * Redirects native module .cxx output out of pnpm's deep node_modules tree.
 * Required for Android release builds on Windows (CMake OBJECT_PATH_MAX = 250).
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const MARKER = 'buildStagingDirectory = file("${rootProject.projectDir}/build/cxx/${project.name}")';

const NATIVE_PACKAGES = [
  'react-native-gesture-handler',
  'react-native-reanimated',
  'react-native-worklets',
  'react-native-screens',
];

function removeExistingMarker(content) {
  return content
    .split('\n')
    .filter((line) => !line.includes('buildStagingDirectory'))
    .join('\n');
}

function shouldPatchCmakeBlock(lines, cmakeLineIndex) {
  for (let index = cmakeLineIndex + 1; index < Math.min(cmakeLineIndex + 8, lines.length); index += 1) {
    const line = lines[index];

    if (/^\s*\}\s*$/.test(line)) {
      break;
    }

    if (/path "(?:CMakeLists\.txt|src\/main\/jni\/CMakeLists\.txt)"/.test(line)) {
      return true;
    }

    if (/^\s*arguments\b/.test(line) || /^\s*if\s*\(/.test(line) || /^\s*targets\(/.test(line)) {
      return false;
    }
  }

  return false;
}

function patchBuildGradle(buildGradlePath) {
  const original = fs.readFileSync(buildGradlePath, 'utf8');
  const content = removeExistingMarker(original);
  const lines = content.split('\n');
  const patched = [];
  let changed = false;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    patched.push(line);

    if (!/^\s*cmake\s*\{\s*$/.test(line)) {
      continue;
    }

    if (!shouldPatchCmakeBlock(lines, index)) {
      continue;
    }

    const indent = `${line.match(/^(\s*)/)[1]}    `;
    patched.push(`${indent}${MARKER}`);
    changed = true;
  }

  if (!changed) {
    return false;
  }

  fs.writeFileSync(buildGradlePath, patched.join('\n'));
  return true;
}

let patchedCount = 0;

for (const packageName of NATIVE_PACKAGES) {
  let packageJsonPath;

  try {
    packageJsonPath = require.resolve(`${packageName}/package.json`, { paths: [ROOT] });
  } catch {
    continue;
  }

  const buildGradlePath = path.join(path.dirname(packageJsonPath), 'android', 'build.gradle');
  if (!fs.existsSync(buildGradlePath)) {
    continue;
  }

  if (patchBuildGradle(buildGradlePath)) {
    patchedCount += 1;
    console.log(`[patch-android-cxx-paths] patched ${packageName}`);
  }
}

if (patchedCount === 0) {
  console.log('[patch-android-cxx-paths] no changes needed');
}
