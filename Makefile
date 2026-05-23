

check:
	npx eslint
	npx prettier . --check

fix:
	npx prettier . --write

git:
	cd .git/hooks && ln -sf ../../prepare-commit-msg prepare-commit-msg
