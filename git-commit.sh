#!/bin/bash
# The git commit hook doesn't actually seem to trigger *BEFORE* the commit so this is a temporary workaround
set -e

npm run build 
git commit -am"$1" --no-verify 
git push
