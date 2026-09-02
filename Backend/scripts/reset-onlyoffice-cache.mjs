import { spawnSync } from 'node:child_process';

function run(command, args) {
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

console.log('Restarting OnlyOffice with updated network config...');
run('docker', ['compose', 'up', '-d', 'onlyoffice', '--force-recreate']);

console.log('Clearing OnlyOffice forgotten backup cache...');
run('docker', [
  'exec',
  'ppr-onlyoffice',
  'bash',
  '-lc',
  'rm -rf /var/lib/onlyoffice/documentserver/App_Data/cache/files/forgotten/* || true',
]);

console.log('OnlyOffice cache reset complete. Open a new document or refresh the editor page.');
