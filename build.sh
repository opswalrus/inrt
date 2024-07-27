#!/usr/bin/env bash

# clean
rm -f ./build/*
mkdir -p ./build

# npm install
# npm run build-bundle
# npm run build-injectable
# npm run build-binary-linux

bun install
bun build ./index.ts --compile --minify --sourcemap --target=bun-linux-x64 --outfile build/inrt-linux-x64
bun build ./index.ts --compile --minify --sourcemap --target=bun-linux-x64-baseline --outfile build/inrt-linux-x64-baseline
bun build ./index.ts --compile --minify --sourcemap --target=bun-linux-arm64 --outfile build/inrt-linux-arm64
bun build ./index.ts --compile --minify --sourcemap --target=bun-darwin-x64 --outfile build/inrt-mac-x64
bun build ./index.ts --compile --minify --sourcemap --target=bun-darwin-arm64 --outfile build/inrt-mac-arm64
bun build ./index.ts --compile --minify --sourcemap --target=bun-windows-x64 --outfile build/inrt-win-x64
bun build ./index.ts --compile --minify --sourcemap --target=bun-windows-x64-baseline --outfile build/inrt-win-x64-baseline
