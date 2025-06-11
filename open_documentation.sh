#!/bin/bash
# This script checks out the 'github_pages' branch and opens the documentation in a web browser.

git checkout github_pages
open docs/index.html
echo "Waiting for input to go back to the master branch..."
read $DUMMY
git checkout master
