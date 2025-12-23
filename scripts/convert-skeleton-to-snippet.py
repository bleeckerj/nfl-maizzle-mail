#!/usr/bin/env python3
"""Convert a newsletter skeleton into a VS Code snippet file."""

from __future__ import annotations

import argparse
import json
import re
from pathlib import Path
from typing import Iterable


def slugify(value: str) -> str:
    """Produce a lowercase kebab slug safe for snippet prefixes."""
    normalized = value.lower()
    cleaned = re.sub(r"[^a-z0-9]+", "-", normalized)
    return cleaned.strip("-") or "snippet"


def build_body_lines(text: str) -> list[str]:
    """Split the skeleton into lines while keeping blank rows."""
    lines = text.splitlines()
    if text.endswith("\n"):
        # Keep the trailing blank line as an empty entry so the snippet preserves the newline.
        lines.append("")
    return lines or [""]


def convert_to_snippet(
    source_path: Path,
    *,
    prefix: str | None = None,
    name: str | None = None,
    description: str | None = None,
    scope: str = "markdown,md,mdx",
    placeholder: bool = True,
) -> dict:
    """Build the snippet structure used by VS Code."""
    source_text = source_path.read_text(encoding="utf-8")
    base_name = source_path.stem
    snippet_body: list[str] = build_body_lines(source_text)
    if placeholder:
        snippet_body.append("$0")

    snippet_name = name or f"Newsletter Template ({base_name})"
    snippet_prefix = prefix or slugify(base_name)
    snippet_description = description or f"Generated from {source_path.name}"

    return {
        snippet_name: {
            "scope": scope,
            "prefix": snippet_prefix,
            "description": snippet_description,
            "body": snippet_body,
        }
    }


def write_snippet(snippet: dict, target_path: Path, force: bool = False) -> None:
    """Emit the JSON snippet to the destination path."""
    if target_path.exists() and not force:
        raise FileExistsError(f"{target_path} already exists (use --force to overwrite).")

    target_path.write_text(json.dumps(snippet, indent=2) + "\n", encoding="utf-8")


def parse_arguments() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Convert a newsletter skeleton markdown file into a VS Code snippet."
    )
    parser.add_argument("skeleton", type=Path, help="Path to the skeleton markdown file.")
    parser.add_argument(
        "--name",
        help="Snippet display name (default: 'Newsletter Template (<basename>)').",
    )
    parser.add_argument(
        "--prefix",
        help="Snippet prefix (default: slugified basename of the skeleton).",
    )
    parser.add_argument(
        "--description",
        help="Snippet description (default: 'Generated from <filename>').",
    )
    parser.add_argument(
        "--scope",
        default="markdown,md,mdx",
        help="Snippet scope (default: 'markdown,md,mdx').",
    )
    parser.add_argument(
        "--no-placeholder",
        dest="placeholder",
        action="store_false",
        help="Do not append the $0 cursor placeholder.",
    )
    parser.add_argument(
        "--force",
        "-f",
        action="store_true",
        help="Overwrite the existing .snippet file if it already exists.",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_arguments()
    skeleton_path = args.skeleton
    if not skeleton_path.exists():
        raise FileNotFoundError(f"Skeleton not found: {skeleton_path}")

    snippet_data = convert_to_snippet(
        skeleton_path,
        prefix=args.prefix,
        name=args.name,
        description=args.description,
        scope=args.scope,
        placeholder=args.placeholder,
    )

    output_path = skeleton_path.with_suffix(".snippet")
    write_snippet(snippet_data, output_path, force=args.force)
    print(f"Snippet written to {output_path}")


if __name__ == "__main__":
    main()
