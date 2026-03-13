import * as path from 'path';
import * as Mocha from 'mocha';
import * as glob from 'glob';

export function run(): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mocha = new (Mocha as any)({ ui: 'tdd', color: true });
  const testsRoot = path.resolve(__dirname, '..');

  return new Promise((resolve, reject) => {
    glob.glob('**/*.test.js', { cwd: testsRoot }, (err: Error | null, files: string[]) => {
      if (err) { return reject(err); }
      files.forEach((f: string) => mocha.addFile(path.resolve(testsRoot, f)));
      try {
        mocha.run((failures: number) => {
          if (failures > 0) {
            reject(new Error(`${failures} tests failed.`));
          } else {
            resolve();
          }
        });
      } catch (e) {
        console.error(e);
        reject(e);
      }
    });
  });
}
