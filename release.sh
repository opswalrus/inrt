#!/usr/bin/env bash

./build.sh

export GITHUB_TOKEN=$(gh auth token)

npm run release -- --ci
