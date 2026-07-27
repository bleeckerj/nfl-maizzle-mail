import importlib.util
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

    def test_generator_includes_visual_defaults(self) -> None:
        self.assert_visual_defaults(GENERATOR.generate_skeleton())
        self.assert_visual_defaults(GENERATOR.generate_skeleton(minimal=True))

    def test_checked_in_skeletons_include_visual_defaults(self) -> None:
        self.assert_visual_defaults(load_skeleton(FULL_SKELETON_PATH))
        self.assert_visual_defaults(load_skeleton(MINIMAL_SKELETON_PATH))


if __name__ == "__main__":
    unittest.main()
