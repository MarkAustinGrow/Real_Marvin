@echo off
REM This script compiles and runs the blog post scheduler test

echo Compiling test-blog-post.ts...
call npx tsc src/test-blog-post.ts --outDir dist/src

echo Running blog post scheduler test...
node dist/src/test-blog-post.js

echo Test completed.
pause
