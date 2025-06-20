#!/usr/bin/env bash -l
# This script deploys the documentation to the github_pages branch of the repository.
set -e

MASTER_BRANCH="master"
GITHUB_PAGES_BRANCH="github_pages"

assert_repo_is_ready() {
    git_check_master_branch

    if [[ ! any_uncommitted_changes ]]; then
        echo "There are uncommitted changes. Please commit or stash them before running this script."
        exit 1
    fi
}


assert_repo_is_ready
npm run build
rm -fr docs/
git checkout $GITHUB_PAGES_BRANCH
git merge $MASTER_BRANCH --no-edit

set +e
rm -fr docs/
npm run docs
git add -A docs/
set -e

git commit -am"Build documentation" --no-verify
git push origin $GITHUB_PAGES_BRANCH
git checkout $MASTER_BRANCH

echo -e "\n\nDocumentation deployed to $GITHUB_PAGES_BRANCH branch.\n\n"
