const { spawn } = require('child_process');
const path = require('path');

console.log('🎨 Starting SCSS File Watcher...');
console.log('📁 Watching: src/app/styles/');
console.log('📤 Output: src/app/styles/');
console.log('⚡ Press Ctrl+C to stop');
console.log('═'.repeat(50));

const watcher = spawn('npx', [
    'sass',
    '--style=expanded',
    '--source-map',
    '--no-error-css',
    '--watch',
    '--poll',
    'src/app/styles:src/app/styles'
], {
    stdio: 'inherit',
    cwd: process.cwd(),
    shell: true
});

watcher.on('error', (error) => {
    console.error('❌ SCSS Watcher Error:', error);
});

watcher.on('close', (code) => {
    console.log(`\n🛑 SCSS Watcher stopped with code ${code}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Stopping SCSS Watcher...');
    watcher.kill('SIGINT');
    process.exit(0);
});

process.on('SIGTERM', () => {
    watcher.kill('SIGTERM');
    process.exit(0);
});
