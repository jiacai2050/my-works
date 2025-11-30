build: clean readme
	uv build

clean:
	rm -rf build dist *.egg-info

help:
	@uv run vc --help

fix:
	ruff check --fix
	ruff format

lint:
	ruff check
	ruff format --check

readme:
	pandoc -f org -t markdown README.org -o README.md

.PHONY: build clean fix lint readme
