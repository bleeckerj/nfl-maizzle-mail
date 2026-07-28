import importlib.util
import json
import unittest
from pathlib import Path

import yaml


REPO_ROOT = Path(__file__).resolve().parents[1]
GENERATOR_PATH = REPO_ROOT / "scripts" / "generate-newsletter-skeleton.py"
FULL_SKELETON_PATH = (
    REPO_ROOT
    / "templates"
    / "dense-discovery"
    / "dense-discovery-skeleton-full.md"
)
MINIMAL_SKELETON_PATH = (
    REPO_ROOT
    / "templates"
    / "dense-discovery"
    / "dense-discovery-skeleton-minimal.md"
)
FULL_SKELETON_SNIPPET_PATH = (
    REPO_ROOT
    / "templates"
    / "dense-discovery"
    / "dense-discovery-skeleton-full.snippet"
)

SPEC = importlib.util.spec_from_file_location(
    "generate_newsletter_skeleton",
    GENERATOR_PATH,
)
GENERATOR = importlib.util.module_from_spec(SPEC)
assert SPEC.loader is not None
SPEC.loader.exec_module(GENERATOR)


def load_skeleton(path: Path) -> dict:
    content = path.read_text(encoding="utf-8")
    _, frontmatter, _ = content.split("---", 2)
    return yaml.safe_load(frontmatter)


class GenerateNewsletterSkeletonTest(unittest.TestCase):
    def assert_visual_defaults(self, payload: dict) -> None:
        social_card = payload["socialCard"]
        self.assertEqual(social_card["titleFontScale"], 0.7)
        self.assertEqual(social_card["subtitleFontScale"], 0.9)
        self.assertEqual(social_card["kickerFontScale"], 1.0)
        self.assertEqual(social_card["footerFontScale"], 1.0)

        intro_image = payload["intro"]["images"][0]
        self.assertEqual(
            intro_image["src"],
            (
                "https://imagedelivery.net/gaLGizR3kCgx5yRLtiRIOw/"
                "b1ae3684-fdc5-4665-95ae-0a66893ff200/w=600?format=webp"
            ),
        )
        self.assertIn("AlgoAllo", intro_image["alt"])

    def assert_featured_project(self, payload: dict) -> None:
        section = payload["sections"][0]
        self.assertEqual(section["type"], "single-column")
        self.assertEqual(section["title"], "From the Projects Collection")

        item = section["items"][0]
        self.assertEqual(item["title"], "Car and Driverless")
        self.assertEqual(
            item["link"]["href"],
            "https://nearfuturelaboratory.com/projects/en/car-and-driverless/",
        )
        self.assertEqual(item["link"]["category"], "speculative-practice")
        self.assertEqual(
            item["image"]["src"],
            (
                "https://imagedelivery.net/gaLGizR3kCgx5yRLtiRIOw/"
                "2375047f-1603-4221-98fc-ee9cf6a90c00/public"
            ),
        )

    def assert_intro_typography_is_inherited(self, payload: dict) -> None:
        content_styles = payload["intro"]["contentStyles"]
        self.assertNotIn("fontSize", content_styles)
        self.assertNotIn("lineHeight", content_styles)

    def test_generator_includes_visual_defaults(self) -> None:
        full = GENERATOR.generate_skeleton()
        minimal = GENERATOR.generate_skeleton(minimal=True)
        self.assert_visual_defaults(full)
        self.assert_visual_defaults(minimal)
        self.assert_featured_project(full)
        self.assert_featured_project(minimal)
        self.assert_intro_typography_is_inherited(full)
        self.assert_intro_typography_is_inherited(minimal)

    def test_checked_in_skeletons_include_visual_defaults(self) -> None:
        full = load_skeleton(FULL_SKELETON_PATH)
        minimal = load_skeleton(MINIMAL_SKELETON_PATH)
        self.assert_visual_defaults(full)
        self.assert_visual_defaults(minimal)
        self.assert_featured_project(full)
        self.assert_featured_project(minimal)
        self.assert_intro_typography_is_inherited(full)
        self.assert_intro_typography_is_inherited(minimal)

    def test_full_skeleton_snippet_matches_checked_in_skeleton(self) -> None:
        snippet = json.loads(FULL_SKELETON_SNIPPET_PATH.read_text(encoding="utf-8"))
        snippet_definition = next(iter(snippet.values()))
        snippet_body = snippet_definition["body"]

        self.assertEqual(snippet_body[-1], "$0")
        self.assertEqual(
            "\n".join(snippet_body[:-1]),
            FULL_SKELETON_PATH.read_text(encoding="utf-8"),
        )


if __name__ == "__main__":
    unittest.main()
