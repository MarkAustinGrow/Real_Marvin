@echo off
echo Running persona upgrade test...

:: Run the TypeScript test file
npx ts-node src/test-persona-upgrade.ts

echo Test completed.
pause
