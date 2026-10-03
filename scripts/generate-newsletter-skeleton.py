#!/usr/bin/env python3
"""Compatibility CLI for the schema-backed starter generator.

The maintained template schema owns fields, examples, and defaults. This wrapper
preserves the old Python command's arguments without a second field catalogue.
It generates source only and never builds or tests a newsletter.
"""
import argparse
from pathlib import Path
import shutil
import subprocess


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--template', default='dense-discovery')
    parser.add_argument('--minimal', action='store_true')
    parser.add_argument('--output', default='newsletter-skeleton.md')
    parser.add_argument('--all-sections', action='store_true')
    parser.add_argument('--sections', nargs='*')
    args = parser.parse_args()
    root = Path(__file__).resolve().parents[1]
    command = [shutil.which('node') or 'node', str(root / 'scripts/generate-skeleton-from-schema.mjs'), '--template', args.template, '--output', args.output]
    if args.minimal:
        command.append('--minimal')
    if args.sections is not None:
        command.extend(['--sections', *args.sections])
    return subprocess.run(command, check=False).returncode


if __name__ == '__main__':
    raise SystemExit(main())
