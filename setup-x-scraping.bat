@echo off
echo Setting up X-Scraping functionality...

echo Creating database tables...
npx ts-node src/test-table-schemas.ts --create

echo Setting up account monitoring...
npx ts-node src/test-account-monitor.ts list

echo Done!
echo.
echo You can now:
echo 1. Add accounts to monitor: test-account-monitor.bat add [handle] [priority] [activity_level]
echo 2. Process accounts: test-account-monitor.bat process [batchSize]
echo 3. View the web interface to manage accounts
echo 4. Start the scheduler: account-monitor-scheduler.bat
