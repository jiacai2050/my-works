build: clean readme
	hatch build

clean:
	rm -rf build dist shgpt.egg-info

fix:
	ruff check --fix
	ruff format

lint:
	ruff check
	ruff format --check

readme:
	pandoc -f org -t markdown README.org -o README.md
	sed -i 's/{.verbatim}//g' README.md

.PHONY: build clean fix lint readme
