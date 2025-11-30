# coding: utf-8

import argparse
import concurrent.futures
import logging
import os
import subprocess
import sys
import threading

from .util import file_size, humanize_bytes, is_video, make_cmd

__version__ = '0.3.1'
COMPRESS_SUFFIX = '-compressed.mp4'
FFMPEG_LOG = '/tmp/video-compress-ffmpeg.log'


class Stats(object):
    """
    Thread-safe counter stats.
    """

    def __init__(self) -> None:
        self.success = 0
        self.failure = 0
        self.skip = 0
        self.lock = threading.Lock()  # protect stats

    def inc_success(self):
        with self.lock:
            self.success += 1

    def inc_failure(self):
        with self.lock:
            self.failure += 1

    def inc_skip(self):
        with self.lock:
            self.skip += 1

    def __format__(self, spec) -> str:
        with self.lock:
            return (
                f'success: {self.success}, failed: {self.failure}, skipped: {self.skip}'
            )


class VideoCompressor(object):
    def __init__(self, max_threads, crf, delete_after_success):
        self.crf = crf
        self.max_threads = max_threads
        self.delete_after_success = delete_after_success

    def __enter__(self):
        logging.info(
            f'Start compressing, crf:{self.crf}, delete:{self.delete_after_success}...'
        )
        self.executor = concurrent.futures.ThreadPoolExecutor(
            max_workers=self.max_threads
        )
        self.ffmpeg_log = open(FFMPEG_LOG, 'a+')
        self.stats = Stats()
        return self

    def __exit__(self, exception_type, exception_value, exception_traceback):
        self.executor.shutdown(wait=True)
        self.ffmpeg_log.close()
        logging.info(f'Compress done, stats:[{self.stats}]')

    def run(self, inputs):
        for input in inputs:
            self.iter(input)

    def call_ffmpeg(self, fi, fo):
        try:
            tmp = fo + '.tmp.mp4'
            cmd = make_cmd(fi, tmp, str(self.crf))
            logging.debug(f'Running: {cmd}')
            self.ffmpeg_log.write(f'Running: {cmd}\n')
            self.ffmpeg_log.flush()
            ret = subprocess.run(cmd, stdout=self.ffmpeg_log, stderr=subprocess.STDOUT)
            logging.debug(f'ffmpeg exit code: {ret.returncode}')
            if ret.returncode != 0:
                logging.error(f'Run ffmpeg failed, exitcode: {ret.returncode}')
                return False

            os.rename(tmp, fo)
            return True
        except Exception as e:
            logging.error(f'Convert {fi} failed, err: {e}')
            return False

    def compress(self, fi):
        if fi.endswith(COMPRESS_SUFFIX):
            self.stats.inc_skip()
            logging.debug(f'{fi} is already compressed, skipping...')
            return

        (root, ext) = os.path.splitext(fi)
        if is_video(ext) is False:
            self.stats.inc_skip()
            logging.debug(f'{fi} is not video, skipping...')
            return

        fo = root + COMPRESS_SUFFIX
        if os.path.exists(fo):
            self.stats.inc_skip()
            logging.debug(f'{fo} already exists, skipping...')
            return

        is_success = self.call_ffmpeg(fi, fo)
        if is_success is True:
            if self.on_success(fi, fo) and self.delete_after_success:
                logging.warning(f'Delete {fi}')
                os.remove(fi)
        else:
            self.on_failure(fi)

    def iter(self, file_or_dir):
        if os.path.isfile(file_or_dir):
            self.executor.submit(self.compress, file_or_dir)
        elif os.path.isdir(file_or_dir):
            for root, _, files in os.walk(file_or_dir):
                for file in files:
                    input_video = os.path.join(root, file)
                    self.executor.submit(self.compress, input_video)

    def on_success(self, fi, fo):
        self.stats.inc_success()
        si = file_size(fi)
        so = file_size(fo)
        if so > si:
            logging.warning(
                f'No need to compress!, in:{humanize_bytes(si)}, out:{humanize_bytes(so)}'
            )
            os.rename(fi, fo)
            return False
        rate = (1 - float(so) / float(si)) * 100
        logging.info(
            f'{fi} size raw:{humanize_bytes(si)}, compressed:{humanize_bytes(so)}, compress rate:{rate:.2f}%'
        )
        return True

    def on_failure(self, input):
        self.stats.inc_failure()
        logging.error(f'{input} compress failed')


def main():
    parser = argparse.ArgumentParser(
        prog='vc',
        description='Compress video by 90% without losing much quality, similar to what Pied Piper achieves.',
    )
    parser.add_argument(
        '-v', '--version', action='version', version='%(prog)s ' + __version__
    )
    parser.add_argument('--verbose', action='store_true', help='show verbose log')
    parser.add_argument(
        '-t',
        '--threads',
        type=int,
        help='max threads to use for compression. (default: %(default)d)',
        default=max(1, os.cpu_count() / 2),
    )
    parser.add_argument(
        '--crf',
        type=int,
        help='constant rate factor, range from 0-51. Higher values mean more compression, smaller file size, but lower quality. (default: %(default)d)',
        default=30,
    )
    parser.add_argument(
        '-x',
        '--delete',
        action='store_true',
        dest='delete_after_success',
        help='delete input video after compress successfully',
    )
    parser.add_argument('inputs', metavar='<video path>', nargs='*')
    args = parser.parse_args()
    log_level = logging.DEBUG if args.verbose else logging.INFO
    logging.basicConfig(
        stream=sys.stdout,
        level=log_level,
        format='%(asctime)s [%(filename)s:%(lineno)d] %(levelname)s %(message)s',
    )

    with VideoCompressor(args.threads, args.crf, args.delete_after_success) as vc:
        vc.run(args.inputs)
