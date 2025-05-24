#!/bin/bash

echo "Optimizing Account Monitoring Tiers..."
echo

# Get the directory of the script
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
cd "$DIR"

echo "Compiling TypeScript..."
npx tsc

if [ $? -ne 0 ]; then
    echo "Failed to compile TypeScript"
    exit 1
fi

echo "Running account tier optimization..."
node dist/src/optimize-account-tiers.js

echo
echo "Optimization completed. Check the output above for results."
