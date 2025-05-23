@echo off
echo Deploying X-Scraping functionality...

REM Step 1: Commit changes to local repository
echo Committing changes to local repository...
git add .
git commit -m "Fix X-Scraping web interface tab functionality"

REM Step 2: Push changes to remote repository
echo Pushing changes to remote repository...
git push origin X-scrape-integration

REM Step 3: Instructions for server deployment
echo.
echo Changes have been pushed to the remote repository.
echo.
echo To deploy on the server, run the following commands:
echo 1. SSH into the server: ssh root@real.marvn.club
echo 2. Navigate to the project directory: cd /opt/real-marvin
echo 3. Pull the changes: git pull origin X-scrape-integration
echo 4. Rebuild and restart the Docker container:
echo    docker-compose down
echo    docker-compose build
echo    docker-compose up -d
echo.
echo Alternatively, you can run this command on the server:
echo.
echo cd /opt/real-marvin ^&^& git pull origin X-scrape-integration ^&^& docker-compose down ^&^& docker-compose build ^&^& docker-compose up -d
echo.
echo Deployment script completed.
pause
