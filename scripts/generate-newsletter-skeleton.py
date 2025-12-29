#!/usr/bin/env python3
"""
Generate a skeleton/boilerplate markdown file for the dense-discovery newsletter template.

This script analyzes the newsletter.html template and creates a complete markdown skeleton
with all available section types and their required/optional fields.

Usage:
    python scripts/generate-newsletter-skeleton.py [--minimal] [--output filename.md]
    
Options:
    --minimal       Generate minimal skeleton with fewer example items per section
    --output FILE   Output filename (default: newsletter-skeleton.md)
    --all-sections  Include ALL available section types (default)
    --sections TYPE [TYPE ...]  Only include specific section types
"""

import argparse
import yaml
from datetime import datetime
from pathlib import Path


# Define all available section types and their field structures
SECTION_DEFINITIONS = {
    'sponsor': {
        'description': 'Sponsored content section',
        'section_fields': ['type', 'title', 'sponsorLink', 'sponsorLabel'],
        'item_fields': {
            'required': ['title'],
            'optional': ['link', 'subtitle', 'description', 'image', 'images', 'readMoreText', 'readMoreLink']
        },
        'example_items': 1
    },
    'dispatch': {
        'description': 'Dispatch/announcement section (item-level SIGNALS tags)',
        'section_fields': ['type', 'title', 'dispatchLink', 'dispatchLabel'],
        'item_fields': {
            'required': ['title'],
            'optional': ['signalsLabel', 'tags', 'link', 'subtitle', 'description', 'image', 'readMoreText', 'readMoreLink']
        },
        'example_items': 1
    },
    'apps-sites': {
        'description': 'Apps and websites (two-column layout)',
        'section_fields': ['type', 'title'],
        'item_fields': {
            'required': ['title'],
            'optional': ['link', 'subtitle', 'description', 'image', 'readMoreText', 'readMoreLink', 'paywall']
        },
        'example_items': 2
    },
    'apps-sites-single-column': {
        'description': 'Apps and websites (single-column layout)',
        'section_fields': ['type', 'title', 'description'],
        'item_fields': {
            'required': ['title'],
            'optional': ['link', 'subtitle', 'description', 'image', 'readMoreText', 'readMoreLink']
        },
        'example_items': 1
    },
    'callout': {
        'description': 'Callout highlight section',
        'section_fields': ['type', 'title'],
        'item_fields': {
            'required': ['calloutText'],
            'optional': ['readMoreText', 'readMoreLink', 'author']
        },
        'example_items': 1
    },
    'quote': {
        'description': 'Quote section',
        'section_fields': ['type', 'title'],
        'item_fields': {
            'required': ['quote'],
            'optional': ['author', 'authorLink']
        },
        'example_items': 1
    },
    'indie-mag': {
        'description': 'Independent magazine/publication (two-column)',
        'section_fields': ['type', 'title'],
        'item_fields': {
            'required': ['title'],
            'optional': ['link', 'description', 'details', 'note', 'image', 'readMoreText', 'readMoreLink', 'paywall']
        },
        'example_items': 1
    },
    'indie-mag-single-column': {
        'description': 'Independent magazine/publication (single-column)',
        'section_fields': ['type', 'title'],
        'item_fields': {
            'required': ['title'],
            'optional': ['link', 'description', 'details', 'note', 'image', 'readMoreText', 'readMoreLink', 'paywall']
        },
        'example_items': 1
    },
    'books-accessories': {
        'description': 'Books, products, and accessories',
        'section_fields': ['type', 'title', 'byline', 'bylineLink', 'authorLabel'],
        'item_fields': {
            'required': ['title'],
            'optional': ['link', 'subtitle', 'description', 'image', 'images', 'authorName', 'authorLabel', 'authorLink', 'isbn', 'linkText']
        },
        'example_items': 1
    },
    'food-for-thought': {
        'description': 'Food for thought / article recommendations',
        'section_fields': ['type', 'title'],
        'item_fields': {
            'required': ['title'],
            'optional': ['link', 'description', 'image', 'channel', 'category', 'sharedBy', 'readMoreText', 'readMoreLink', 'paywall']
        },
        'example_items': 2
    },
    'aesthetically-pleasing': {
        'description': 'Aesthetically pleasing visual content',
        'section_fields': ['type', 'title', 'description'],
        'item_fields': {
            'required': ['image'],
            'optional': ['title', 'imageLink', 'link', 'description', 'readMoreText']
        },
        'example_items': 1
    },
    'classifieds': {
        'description': 'Classified listings',
        'section_fields': ['type', 'title', 'description', 'bookingLink', 'bookingText'],
        'item_fields': {
            'required': ['content'],
            'optional': ['title', 'link', 'linkText', 'images']
        },
        'example_items': 1
    },
    'animated-image': {
        'description': 'Animated images/GIFs',
        'section_fields': ['type', 'title'],
        'item_fields': {
            'required': ['image'],
            'optional': ['title', 'description', 'link']
        },
        'example_items': 1
    }
}


def generate_example_item(section_type, item_num=1, minimal=False):
    """Generate an example item for a given section type."""
    definition = SECTION_DEFINITIONS[section_type]
    item = {}
    
    # Add required fields
    for field in definition['item_fields']['required']:
        if field == 'quote':
            item[field] = f'Example quote text for item {item_num}'
        elif field == 'content':
            item[field] = f'<p>Example classified content for item {item_num}.</p>'
        elif field == 'image':
            item[field] = 'https://fpoimg.com/800x600?text=Preview&bg_color=e6e6e6&text_color=4FAAAA?text=Image'
        else:
            item[field] = f'{section_type.replace("-", " ").title()} Item {item_num}'
    
    # Populate all optional fields (when not minimal) so the skeleton is complete
    if not minimal:
        optional = definition['item_fields'].get('optional', [])

        for opt in optional:
            # don't overwrite anything already set (e.g. required 'image')
            if opt in item:
                continue

            # URL-like fields
            if opt in ('link', 'readMoreLink', 'authorLink', 'imageLink', 'logoLink'):
                item[opt] = 'https://example.com'

            # Rich text fields
            elif opt in ('description', 'details', 'note', 'content'):
                item[opt] = f'<p>Example {opt} for {section_type} item {item_num}.</p>'

            # Small text fields
            elif opt in ('subtitle', 'sharedBy', 'authorName', 'authorLabel', 'linkText'):
                if opt == 'authorLabel':
                    item[opt] = 'Author'
                else:
                    item[opt] = f'Example {opt} for item {item_num}'

            # Images
            elif opt == 'image':
                item[opt] = 'https://fpoimg.com/800x600?text=Preview&bg_color=e6e6e6&text_color=4FAAAA?text=Image'
            elif opt == 'images':
                if section_type == 'classifieds':
                    item[opt] = [
                        {
                            'src': 'https://fpoimg.com/800x600?text=Preview&bg_color=e6e6e6&text_color=4FAAAA?text=Image+1',
                            'alt': f'Alternate text for classified {item_num} image 1'
                        },
                        {
                            'src': 'https://fpoimg.com/800x600?text=Preview&bg_color=e6e6e6&text_color=4FAAAA?text=Image+2',
                            'alt': f'Alternate text for classified {item_num} image 2'
                        },
                        {
                            'src': 'https://fpoimg.com/800x600?text=Preview&bg_color=e6e6e6&text_color=4FAAAA?text=Image+3',
                            'alt': f'Alternate text for classified {item_num} image 3'
                        }
                    ]
                else:
                    item[opt] = [
                        {
                            'src': 'https://fpoimg.com/800x600?text=Preview&bg_color=e6e6e6&text_color=4FAAAA?text=Image',
                            'alt': f'Alternate text for item {item_num} image 1',
                            'link': 'https://example.com/image-destination'
                        },
                        {
                            'src': 'https://fpoimg.com/800x600?text=Preview%20Two&bg_color=f5f5f5&text_color=4FAAAA?text=Second',
                            'alt': f'Alternate text for item {item_num} image 2'
                        }
                    ]

            # Read-more text
            elif opt in ('readMoreText', 'readMoreTxt'):
                item[opt] = 'Read more →'

            # Boolean flags
            elif opt == 'paywall':
                item[opt] = True

            # tags / categories / channels
            elif opt in ('tags',):
                item[opt] = ['TAG1', 'TAG2']
            elif opt == 'signalsLabel':
                item[opt] = 'SIGNALS'
            elif opt in ('channel', 'category'):
                item[opt] = f'Example {opt}'

            # ISBN or other identifiers
            elif opt == 'isbn':
                item[opt] = '978-1-23456-789-7'

            # fallback for any other optional field
            else:
                item[opt] = f'Example {opt}'

        # If both single-image and multi-image variants exist, prefer `images`.
        # This keeps the skeleton examples clear while maintaining backward compatibility
        # for content that still uses `image`.
        if 'images' in item and 'image' in item:
            del item['image']
    
    return item


def generate_section(section_type, minimal=False):
    """Generate an example section of the given type."""
    definition = SECTION_DEFINITIONS[section_type]
    section = {'type': section_type}
    
    # Add section-level fields
    for field in definition['section_fields']:
        if field == 'type':
            continue
        elif field == 'title':
            section[field] = f'{section_type.replace("-", " ").title()} Section'
        elif field == 'tags':
            section[field] = ['TAG1', 'TAG2'] if not minimal else []
        elif field == 'description':
            section[field] = f'<p>Description for {section_type} section.</p>'
        elif field == 'authorLabel':
            if not minimal:
                section[field] = 'Author'
        else:
            # Optional fields - skip in minimal mode
            if not minimal:
                section[field] = f'Example {field}'
    
    # Add items
    num_items = 1 if minimal else definition['example_items']
    section['items'] = [generate_example_item(section_type, i+1, minimal) for i in range(num_items)]
    
    return section


def generate_skeleton(sections=None, minimal=False):
    """Generate the complete newsletter skeleton."""
    
    if sections is None:
        sections = list(SECTION_DEFINITIONS.keys())
    
    # Build the data structure
    data = {
        'template': 'dense-discovery',
        'title': 'Newsletter Title',
        'preheader': 'Short preview text that appears in email clients',
        'sectionStylesFile': 'templates/dense-discovery/section-styles.json',
        'intro': {
            'title': 'Welcome',
            'viewOnlineLink': 'https://nearfuturelaboratory.com/newsletters/2025/wxx-yxx',
            'content': '<p>Introduction paragraph for the newsletter.</p>'
        },
        'header': {
            'quote': 'Inspiring header quote',
            'author': 'Quote Author',
            'featuredArtist': {
                'name': 'Artist Name',
                'link': '#'
            },
            'featuredImage': 'https://fpoimg.com/600x600?text=Preview&bg_color=e6e6e6&text_color=4FAAAA?text=Featured',
            'logoBottom': 'https://imagedelivery.net/gaLGizR3kCgx5yRLtiRIOw/5240f451-4c17-47c9-6c5a-50e50d22c500/w=200?format=webp',
            'logoTop': 'https://imagedelivery.net/gaLGizR3kCgx5yRLtiRIOw/80a173f3-1366-4052-5889-5dbcf8f25200/w=200?format=webp'
        },
        'sections': [generate_section(s, minimal) for s in sections],
        'footer': {
            'emailShare': 'mailto:?subject=Newsletter%20Issue&body=Check%20out%20this%20issue%20of%20the%20Near%20Future%20Laboratory%20newsletter:%20https://nearfuturelaboratory.com/newsletters/2025/w50-y25/',
            'newsletterSubscribeLink': 'https://nearfuturelaboratory.com/newsletter/',
            'logo': 'https://nearfuturelaboratory.com/images/site/NFL_LOGO__NFL_BLUEISH_200px.png',
            'logoLink': 'https://nearfuturelaboratory.com',
            'socialLinks': {
                'applepodcasts': [{
                    'url': 'https://podcasts.apple.com/us/podcast/near-future-laboratory-podcast/id1546452193',
                    'title': 'Near Future Laboratory on Apple Podcasts'
                }],
                'spotify': [{
                    'url': 'https://open.spotify.com/show/1vHzwGE5J19LvXSo8M93MM',
                    'title': 'Near Future Laboratory on Spotify'
                }],
                'github': [
                    {'url': 'https://github.com/bleeckerj', 'title': 'Personal GitHub'},
                    {'url': 'https://github.com/nearfuturelaboratory', 'title': 'Near Future Laboratory GitHub'},
                    {'url': 'https://github.com/nearfuturelaboratory', 'title': 'Near Future Laboratory GitHub'}
                ],
                'instagram': [
                    {'url': 'https://instagram.com/darthjulian', 'title': 'Personal Instagram'},
                    {'url': 'https://instagram.com/nearfuturelaboratory', 'title': 'Company Instagram'}
                ],
                'linkedin': [
                    {'url': 'https://linkedin.com/in/julianbleecker', 'title': 'Personal LinkedIn'},
                    {'url': 'https://www.linkedin.com/company/near-future-laboratory/', 'title': 'Near Future Laboratory LinkedIn'}
                ],
                'youtube': [{
                    'url': 'https://youtube.com/@nearfuturelaboratory',
                    'title': 'YouTube Channel'
                }],
                'discord': [{
                    'url': 'https://patreon.com/nearfuturelaboratory',
                    'title': 'Join Patreon to join the Discord Community'
                }],
                'patreon': [{
                    'url': 'https://patreon.com/nearfuturelaboratory',
                    'title': 'Support me on Patreon'
                }],
                'substack': [{
                    'url': 'https://newsletter.substack.com',
                    'title': 'Newsletter on Substack'
                }]
            },
            'unsubscribeLink': '[unsubscribe]',
            'shareUrl': 'https://nearfuturelaboratory.com/newsletters/2025/w50-y25',
            'archiveUrl': 'https://nearfuturelaboratory.com/newsletters',
            'gratitude': (
                "This email template is a tuned up fork with a Markdown-JSON-Python-Maizzle based production workflow. "
                "It's a work-in-progress building on a refactor of the <a href='https://densediscovery.com'>Dense Discovery</a> "
                "newsletter's look and vibe, created by <a href='https://www.brizk.com'>Kai Brach</a>. "
                "I have been a paid ‘friend of Dense Discovery’ for, well..I'm not sure how many years now. "
                "It's a great newsletter and I would encourage you to subscribe and become a paid member."
            ),
            'address': '© 2025 Near Future Laboratory<br>Venice Beach, California<br>United States',
            'colophon': 'Imagination is not a luxury. It’s an early-warning system for possibility.'
        }
    }
    
    return data


def main():
    parser = argparse.ArgumentParser(
        description='Generate a skeleton markdown file for the dense-discovery newsletter template.'
    )
    parser.add_argument(
        '--minimal',
        action='store_true',
        help='Generate minimal skeleton with fewer example items'
    )
    parser.add_argument(
        '--output',
        '-o',
        default='newsletter-skeleton.md',
        help='Output filename (default: newsletter-skeleton.md)'
    )
    parser.add_argument(
        '--sections',
        nargs='+',
        choices=list(SECTION_DEFINITIONS.keys()),
        help='Only include specific section types'
    )
    parser.add_argument(
        '--list-sections',
        action='store_true',
        help='List all available section types and exit'
    )
    
    args = parser.parse_args()
    
    # List sections and exit
    if args.list_sections:
        print("\nAvailable section types:\n")
        for section_type, definition in SECTION_DEFINITIONS.items():
            print(f"  {section_type}")
            print(f"    {definition['description']}")
            print(f"    Required fields: {', '.join(definition['item_fields']['required'])}")
            print(f"    Optional fields: {', '.join(definition['item_fields']['optional'])}")
            print()
        return
    
    # Generate the skeleton
    skeleton = generate_skeleton(sections=args.sections, minimal=args.minimal)
    
    # Write to file
    output_path = Path(args.output)
    
    # Create YAML front matter
    yaml_str = yaml.dump(skeleton, default_flow_style=False, sort_keys=False, allow_unicode=True)
    
    # Write to markdown file
    with output_path.open('w') as f:
        f.write('---\n')
        f.write(yaml_str)
        f.write('---\n')
    
    print(f"✓ Newsletter skeleton generated: {output_path}")
    print(f"  Sections included: {len(skeleton['sections'])}")
    print(f"  Mode: {'minimal' if args.minimal else 'full'}")


if __name__ == '__main__':
    main()
