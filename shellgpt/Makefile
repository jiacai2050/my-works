tui:
	uv run python -m shellgpt -t $(args)

repl:
	uv run python -m shellgpt -r $(args)

build: clean
	uv build

clean:
	rm -rf build dist

fix:
	ruff check --fix
	ruff format

lint:
	ruff check
	ruff format --check

sync:
	uv sync

ut:
	uv run python -m unittest -v

contents:
	@ python download-contents.py

dep:
	pip install -e .
	pip install -e "shellgpt.[tui]"

.PHONY: tui repl build clean fix lint sync contents dep
