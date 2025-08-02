tui:
	python -m shellgpt -t $(args)

repl:
	python -m shellgpt -r $(args)

build: clean
	uvbuild

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

ut: sync
	.venv/bin/python -m unittest -v

contents:
	@ python download-contents.py

dep:
	pip install -e .
	pip install -e "shellgpt.[tui]"

.PHONY: tui repl build clean fix lint sync contents dep
