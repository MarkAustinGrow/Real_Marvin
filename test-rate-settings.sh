#!/bin/bash

echo "Testing API Rate Settings Service..."
echo

# Get the directory of this script
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
cd "$DIR"

echo "Running TypeScript compilation..."
npx tsc src/test-rate-settings.ts --outDir dist --target es2020 --module commonjs --moduleResolution node --esModuleInterop true --allowSyntheticDefaultImports true --strict false --skipLibCheck true

if [ $? -ne 0 ]; then
    echo "TypeScript compilation failed!"
    exit 1
fi

echo
echo "Running rate settings test..."
node dist/src/test-rate-settings.js

if [ $? -ne 0 ]; then
    echo "Rate settings test failed!"
    exit 1
fi

echo
echo "Rate settings test completed successfully!"
