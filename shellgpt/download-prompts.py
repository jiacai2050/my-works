#!/usr/bin/env -S uv run --script
# coding: utf-8
# /// script
# dependencies = [
#   "tomli-w",
# ]
# ///

import csv
import os
import subprocess

import tomli_w

# https://github.com/f/awesome-chatgpt-prompts/
url = 'https://raw.githubusercontent.com/f/awesome-chatgpt-prompts/main/prompts.csv'
PFILE = os.path.expanduser('./prompts.toml')


def main():
    out = subprocess.getoutput(f'curl -LsSf {url}')
    rdr = csv.reader(out.split('\n'))
    contents = {}
    for row in rdr:
        name = (
            row[0]
            .replace('(', '')
            .replace(')', '')
            .replace(' ', '-')
            .replace('`', '')
            .replace('/', '-')
            .lower()
        )
        if name == 'act':
            # skip first row
            continue

        content = row[1]
        contents[name] = content

    with open(PFILE, 'wb') as f:
        tomli_w.dump(contents, f)
    print(f'Writing {len(contents)} prompts to {PFILE}')


if __name__ == '__main__':
    main()
