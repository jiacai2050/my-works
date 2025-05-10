
write:
	npx prettier . --write

check:
	npx eslint
	npx prettier . --check

git:
	cd .git/hooks && ln -sf ../../prepare-commit-msg prepare-commit-msg
