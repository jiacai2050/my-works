# Video-compress

[![](https://img.shields.io/pypi/v/video-compress.svg)](https://pypi.org/project/video-compress)
[![](https://github.com/jiacai2050/video-compress/actions/workflows/ci.yml/badge.svg)](https://github.com/jiacai2050/video-compress/actions/workflows/ci.yml)

Compress video by 90% without losing much quality, similar to what [Pied
Piper](https://en.wikipedia.org/wiki/Silicon_Valley_(TV_series))
achieves.

![](pied-piper.jpg)

> Inspired by <https://x.com/mortenjust/status/1818027566932136062>

# Install

First install the [ffmpeg](https://www.ffmpeg.org/download.html), then

``` bash
pip install video-compress
```

This will install two commands: `vc`{.verbatim},
`video-compress`{.verbatim}, which are identical.

# Usage

``` example
usage: vc [-h] [-v] [--verbose] [-t THREADS] [--crf CRF] [--delete]
          [<video path> ...]

Compression video like magic 🤩

positional arguments:
  <video path>

options:
  -h, --help            show this help message and exit
  -v, --version         show program's version number and exit
  --verbose             show verbose log
  -t THREADS, --threads THREADS
                        max threads to use for compression. (default: 6)
  --crf CRF             constant rate factor, range from 0-51. Higher values
                        mean more compression, smaller file size, but lower
                        quality. (default: 30)
  --delete              delete input video after compress successfully
```

Positional arguments can be either video files or directories.

For each directory, `vc`{.verbatim} will iteratively walk the dir to
search for all videos to compress, the compressed video will be named
after `${input}-compressed.mp4`{.verbatim}.
