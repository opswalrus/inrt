#!/usr/bin/env bash

export GITHUB_TOKEN=$(gh auth token)

npm run release -- --ci

export VERSION=$(git describe --tags --abbrev=0)

./build.sh

gh release upload $VERSION build/*.zip
