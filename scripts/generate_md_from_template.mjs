#!/usr/bin/env node
import fs from 'fs/promises'
import path from 'path'
import yaml from 'js-yaml'

function usage() {
  console.log('Usage: node scripts/generate_md_from_template.mjs <template-name> [--output <path>]')
  process.exit(1)
}

const args = process.argv.slice(2)
if (args.length === 0) usage()

// flags
let templateName = null
let outPath = null
let itemsPerSection = 1
let doBatch = false
for (let i = 0; i < args.length; i++) {
  const a = args[i]
  if (a === '--output' && args[i+1]) { outPath = args[i+1]; i++; continue }
  if (a === '--items' && args[i+1]) { itemsPerSection = parseInt(args[i+1], 10) || 1; i++; continue }
  if (a === '--batch') { doBatch = true; continue }
  // first non-flag argument is templateName
  if (!templateName) templateName = a
}

if (!doBatch && !templateName) usage()

const ROOT = process.cwd()
const templateDir = path.join(ROOT, 'templates', templateName)
const newsletterPath = path.join(templateDir, 'newsletter.html')
const templateSectionStyles = path.join(templateDir, 'section-styles.json')

async function fileExists(p) {
  try {
    await fs.access(p)
    return true
  } catch (e) {
    return false
  }
}

function uniquePreserveOrder(arr) {
  const seen = new Set()
  const out = []
  for (const v of arr) {
    if (!seen.has(v)) { seen.add(v); out.push(v) }
  }
  return out
}

function renderYaml(value, indent = 0) {
  const pad = '  '.repeat(indent)
  if (value === null) return 'null'

  if (Array.isArray(value)) {
    if (value.length === 0) return '[]'
    return value.map(item => {
      if (typeof item === 'object' && item !== null) {
        return pad + '- ' + '\n' + renderYaml(item, indent + 1)
      }
      // scalar in array
      if (typeof item === 'string') {
        if (item.includes('\n') || item.trim().startsWith('<')) {
          const lines = item.replace(/\r/g, '').split('\n')
          return pad + '- |-' + '\n' + lines.map(l => pad + '  ' + l).join('\n')
        }
        return pad + '- ' + maybeQuote(item)
      }
      return pad + '- ' + String(item)
    }).join('\n')
  }

  if (typeof value === 'object') {
    return Object.entries(value).map(([k, v]) => {
      const key = `${pad}${k}:`
      if (v === null) return `${key} null`
      if (Array.isArray(v)) {
        if (v.length === 0) return `${key} []`
        return `${key}\n${renderYaml(v, indent + 1)}`
      }
      if (typeof v === 'object') {
        return `${key}\n${renderYaml(v, indent + 1)}`
      }
      if (typeof v === 'string') {
        if (v.includes('\n') || v.trim().startsWith('<')) {
          const lines = v.replace(/\r/g, '').split('\n')
          return `${key} |-\n` + lines.map(l => pad + '  ' + l).join('\n')
        }
        return `${key} ${maybeQuote(v)}`
      }
      return `${key} ${String(v)}`
    }).join('\n')
  }

  // primitive
  if (typeof value === 'string') return maybeQuote(value)
  return String(value)
}

function maybeQuote(s) {
  if (s === '') return '""'
  if (/^[-?:,{}\[\]#&*!|>'"%@`]/.test(s)) return `"${s.replace(/"/g, '\\"')}"`
  if (/[\n\r]/.test(s)) return `"${s.replace(/"/g, '\\"')}"`
  if (/[:{}\[\],&*#?^\\<>!%@`-]/.test(s)) return `"${s.replace(/"/g, '\\"')}"`
  return s
}

function makeFpoItemForType(type) {
  const now = new Date().toLocaleDateString('en-US')
  const baseLink = 'https://example.com'
  const shortParagraph = (s) => `<p>${s}</p>`

  const approx30 = (seed) => {
    // produce ~30-word descriptive sentence tuned to the seed
    switch (seed) {
      case 'feature':
        return 'This featured note highlights a project or event connected to the issue, with enough context for readers to understand why it belongs here.'
      case 'sponsor':
        return 'This legacy sponsor note highlights a project connected to the issue, with enough context for readers to understand why it belongs here.'
      case 'apps-sites':
        return 'A compact review of a useful app or site, focusing on one notable feature and how it changes a simple daily task for the better.'
      case 'quote':
        return 'A short, resonant excerpt selected for its clarity and relevance; it frames the issue and invites reflection without demanding action.'
      case 'indie-mag':
        return 'An excerpt introducing a thoughtful long-form piece: it sketches a scene, raises a question, and suggests why readers should keep reading.'
      case 'indie-mag-single-column':
        return 'A reflective opener for a single-column feature that foregrounds a human detail and hints at the broader argument that follows.'
      case 'books-accessories':
        return 'A brief, opinionated note on a book or object: what feels distinctive, who would enjoy it, and one concrete reason to consider buying.'
      case 'food-for-thought':
        return 'A provocative observation or micro-essay that connects two otherwise separate ideas and leaves the reader with a single, memorable insight.'
      case 'aesthetically-pleasing':
        return 'A descriptive paragraph about a pleasing visual or tactile object, noting its qualities and the small, surprising joys it offers.'
      case 'classifieds':
        return 'A crisp classified-style listing that names the item, supplies a single-line description, and includes where to inquire or purchase.'
      case 'animated-image':
        return 'A short caption describing an animated image or visual experiment, focusing on motion, timing, and the intended impression.'
      default:
        return `A short sample paragraph about ${seed} that explains its appeal and gives one concrete reason a reader might care.`
    }
  }

  function generateLongText(seed, paragraphs = 4) {
    // Create multiple, semantically-relevant English paragraphs (no Latin)
    const outputs = []
    for (let p = 0; p < paragraphs; p++) {
      switch (seed) {
        case 'feature':
          outputs.push(
            p === 0
              ? 'This featured item introduces a project, event, or resource connected to the issue. The note explains why it belongs here and gives readers one clear reason to look closer.'
              : 'The follow-up copy can point to a use case, date, release, or related context. Readers can follow the link for details, registration, demos, or further reading.'
          )
          break
        case 'sponsor':
          outputs.push(
            p === 0
              ? 'This legacy sponsor item introduces a project, event, or resource connected to the issue. The note explains why it belongs here and gives readers one clear reason to look closer.'
              : 'The follow-up copy can point to a use case, date, release, or related context. Readers can follow the link for details, registration, demos, or further reading.'
          )
          break
        case 'apps-sites':
          outputs.push(
            p === 0
              ? 'This app is a small, focused utility that solves a particular friction we noticed in everyday workflows. It foregrounds one interaction model that feels smart, efficient, and a touch humane compared with alternatives.'
              : 'In practical terms, the app streamlines a three-step task into one. The team behind it has prioritized clarity and minimal friction, which is worth documenting for readers who care about saving a few minutes each day.'
          )
          break
        case 'quote':
          outputs.push(
            p === 0
              ? 'This excerpt was chosen because it compresses a broader argument into a single memorable sentence. It frames the conversation and gives the reader a thread to follow through the rest of the issue.'
              : 'Context: the speaker wrote this in response to changes in their field; the short line highlights a useful tension between intention and effect that appears elsewhere in our coverage.'
          )
          break
        case 'indie-mag':
        case 'indie-mag-single-column':
          outputs.push(
            p === 0
              ? 'The piece begins with a concrete scene that gestures toward a larger question: who benefits from the design choices we now treat as inevitable? The excerpt sets tone and stakes without resolving the argument.'
              : 'As you read more, the author traces a small historical thread and connects it to present-day practices. That combination of close attention and wider synthesis is the piece’s real value, and this excerpt shows a glimpse of it.'
          )
          break
        case 'books-accessories':
          outputs.push(
            p === 0
              ? 'This short review highlights one distinctive aspect of the book or object — its approach to craft, argument, or usefulness — and connects that quality to a kind of reader who will get the most out of it.'
              : 'If you are choosing between several options, consider this one for its durability of ideas and material build; a single concrete example can illustrate what sets it apart.'
          )
          break
        case 'food-for-thought':
          outputs.push(
            p === 0
              ? 'This micro-essay connects two ideas that usually live in separate conversations, inviting the reader to hold the tension between them and consider what new questions emerge.'
              : 'We suggest a quick experiment or a question to ask next: try the connection for a week and note one surprising outcome. That practice often reveals practical insight.'
          )
          break
        case 'aesthetically-pleasing':
          outputs.push(
            p === 0
              ? 'A detailed description emphasizes the object’s proportions, color, and materiality, explaining why those small choices create a durable affective response in direct experience.'
              : 'Beyond aesthetics, we note how the piece performs over time: how it wears, how it responds to light, and why those changes matter to the person who keeps it around.'
          )
          break
        case 'classifieds':
          outputs.push(
            p === 0
              ? 'Concise listing details: what the item is, one line on condition or feature, and clear instructions for how to inquire. Keep the language direct and action-oriented.'
              : 'Include price, availability, or a preferred contact method; these details remove friction and increase the chance of a successful match.'
          )
          break
        case 'animated-image':
          outputs.push(
            p === 0
              ? 'Describe the animation’s movement and timing in concrete terms: what changes, how quickly, and what visual affordances the motion emphasizes.'
              : 'Offer a note on how the animation should be viewed (looping, muted, full-screen) and what aspect the viewer should attend to for the intended effect.'
          )
          break
        default:
          outputs.push(
            p === 0
              ? `A longer sample paragraph about ${seed}, exploring a small concrete example and one reason the reader should care.`
              : 'Follow-up sentences expand the example, offering a next step or a suggestion for further reading.'
          )
      }
    }
    return outputs.map(par => `<p>${par}</p>`).join('\n')
  }

  switch (type) {
    case 'feature':
      return {
        title: 'Featured note',
        link: baseLink,
        description: generateLongText('feature', 4),
        readMoreText: 'Learn more'
      }

    case 'sponsor':
      return {
        title: 'Legacy sponsor note',
        link: baseLink,
        description: generateLongText('sponsor', 4),
        readMoreText: 'Learn more'
      }

    case 'apps-sites':
      return {
        title: 'Notable app / site',
        link: baseLink,
        subtitle: 'Handy, delightful, or surprising',
        description: generateLongText('apps-sites', 3)
      }

    case 'quote':
      return {
        quote: '“Small, precise gestures often reveal large thinking.”',
        author: 'A. Thinker',
        authorLink: baseLink
      }

    case 'indie-mag':
      return {
        title: 'Long read: an indie piece worth your time',
        link: baseLink,
        description: generateLongText('indie-mag', 4),
        details: generateLongText('indie-mag', 1),
        note: 'Note: subscription may be required.'
      }
    case 'indie-mag-single-column':
      return {
        title: 'Long read: an indie piece worth your time',
        link: baseLink,
        description: generateLongText('indie-mag-single-column', 4),
        details: generateLongText('indie-mag-single-column', 1),
        note: 'Note: subscription may be required.'
      }

    case 'books-accessories':
      return {
        title: 'Worth owning: a small object',
        link: baseLink,
        description: generateLongText('books-accessories', 3)
      }

    default:
      return {
        title: `${type} sample title`,
        link: baseLink,
        description: generateLongText(type, 3)
      }
  }
}

async function generateForTemplate(template) {
  const tDir = path.join(ROOT, 'templates', template)
  const tNewsletter = path.join(tDir, 'newsletter.html')
  const tSectionStyles = path.join(tDir, 'section-styles.json')
  if (!await fileExists(tDir)) {
    console.error(`Template not found: ${tDir}`)
    return
  }

  let newsletter = ''
  try {
    newsletter = await fs.readFile(tNewsletter, 'utf8')
  } catch (e) {
    // okay, fall back
  }

  // Detect section types from newsletter.html using simple regex
  const sectionTypeRe = /section\.type\s*===\s*['"`]([a-zA-Z0-9_\-]+)['"`]/g
  const sectionTypes = []
  if (newsletter) {
    let m
    while ((m = sectionTypeRe.exec(newsletter)) !== null) {
      sectionTypes.push(m[1])
    }
  }

  // If none found, look for section-styles.json keys as a hint
  if (sectionTypes.length === 0 && await fileExists(tSectionStyles)) {
    try {
      const ss = JSON.parse(await fs.readFile(tSectionStyles, 'utf8'))
      if (ss && ss.sectionStyles) {
        sectionTypes.push(...Object.keys(ss.sectionStyles))
      }
    } catch (e) {
      // ignore parse failures
    }
  }

  const types = uniquePreserveOrder(sectionTypes.length ? sectionTypes : ['feature', 'apps-sites', 'quote', 'indie-mag'])

  // Build frontmatter
  const front = {
    template: templateName,
    title: `FPO: ${templateName} sample title`,
    preheader: 'FPO preheader — short summary line',
  }
  if (await fileExists(tSectionStyles)) {
    front.sectionStylesFile = `templates/${template}/section-styles.json`
  }


  // --- Scan components for intro.* fields ---
  const introFields = new Set(['title', 'viewOnlineLink', 'content']);
  const componentsDir = path.join(tDir, 'components');
  // collect item.* fields found in components (to include in sections)
  const componentItemFields = new Set();
  if (await fileExists(componentsDir)) {
    // Recursively walk componentsDir to find all .html files
    async function walkDir(dir) {
      const out = []
      const entries = await fs.readdir(dir, { withFileTypes: true })
      for (const ent of entries) {
        const p = path.join(dir, ent.name)
        if (ent.isDirectory()) {
          out.push(...await walkDir(p))
        } else if (ent.isFile() && ent.name.endsWith('.html')) {
          out.push(p)
        }
      }
      return out
    }

    const files = await walkDir(componentsDir)
    for (const filePath of files) {
      try {
        const content = await fs.readFile(filePath, 'utf8')
        // Match intro.something (e.g., intro.quote, intro.title)
        const matches = content.matchAll(/intro\.([a-zA-Z0-9_]+)/g)
        for (const m of matches) {
          introFields.add(m[1])
        }
        // Match item.something inside components as well (dot and bracket form)
        const itemDotMatches = content.matchAll(/item\s*\.\s*([a-zA-Z0-9_]+)/g)
        for (const m of itemDotMatches) componentItemFields.add(m[1])
        const itemBracketMatches = content.matchAll(/item\s*\[\s*['\"]([a-zA-Z0-9_]+)['\"]\s*\]/g)
        for (const m of itemBracketMatches) componentItemFields.add(m[1])
      } catch (e) { /* ignore */ }
    }
  }

  // Provide FPO values for known intro fields
  const intro = {};
  for (const field of introFields) {
    switch (field) {
      case 'title':
        intro.title = 'Welcome — FPO intro title'; break;
      case 'viewOnlineLink':
        intro.viewOnlineLink = '#'; break;
      case 'content':
        intro.content = '<p>This is a short intro paragraph that will render in the template intro slot.</p>'; break;
      case 'quote':
        intro.quote = '“FPO intro quote — a short, resonant excerpt for the intro section.”'; break;
      default:
        intro[field] = `FPO for intro.${field}`;
    }
  }

  const header = {
    quote: 'FPO header quote',
    author: 'Header Author',
    featuredArtist: { name: 'Artist Name', link: '#' },
    featuredImage: 'https://via.placeholder.com/386x200?text=Featured'
  }


  // --- Scan newsletter.html for item.* fields per section type ---
  let newsletterHtml = ''
  try {
    newsletterHtml = await fs.readFile(newsletterPath, 'utf8')
  } catch (e) {}

  function extractItemFields(sectionType) {
    // More robust approach:
    // 1. Find all section.type occurrences (with positions).
    // 2. For the given sectionType, take the slice from its position to the next section occurrence (or EOF).
    // 3. Within that slice, find all <each loop="item in section.items">...</each> blocks and extract item.* fields.
    const sectionTypeRe = /section\.type\s*===\s*['"`]([a-zA-Z0-9_\-]+)['"`]/g
    const sectionPositions = []
    let sm
    while ((sm = sectionTypeRe.exec(newsletterHtml)) !== null) {
      sectionPositions.push({ type: sm[1], index: sm.index })
    }
    if (sectionPositions.length === 0) return []

    // Find the position for the requested sectionType
    let found = null
    for (let i = 0; i < sectionPositions.length; i++) {
      if (sectionPositions[i].type === sectionType) {
        const start = sectionPositions[i].index
        const end = (i + 1 < sectionPositions.length) ? sectionPositions[i + 1].index : newsletterHtml.length
        found = { start, end }
        break
      }
    }
    if (!found) return []

    const slice = newsletterHtml.slice(found.start, found.end)
    const fields = new Set()

    // Find all each blocks in the slice
    const eachRe = /<each\s+loop=["']item in section.items["']>([\s\S]*?)<\/each>/g
    let em
    while ((em = eachRe.exec(slice)) !== null) {
      const block = em[1]
      // item.field forms
      const itemFieldRe = /item\s*\.\s*([a-zA-Z0-9_]+)/g
      let m
      while ((m = itemFieldRe.exec(block)) !== null) fields.add(m[1])
      // bracketed form: item['field'] or item["field"]
      const itemBracketRe = /item\s*\[\s*['\"]([a-zA-Z0-9_]+)['\"]\s*\]/g
      while ((m = itemBracketRe.exec(block)) !== null) fields.add(m[1])
    }

    // Also scan the slice outside of explicit each blocks for item.* usages (cover edge cases)
    const itemAnywhereRe = /item\s*\.\s*([a-zA-Z0-9_]+)/g
    let am
    while ((am = itemAnywhereRe.exec(slice)) !== null) fields.add(am[1])

    return Array.from(fields)
  }

  const sections = types.map((t, sIdx) => {
    // extract fields from newsletter.html for this section, and union any fields found in components
    const itemFields = uniquePreserveOrder([...(extractItemFields(t) || []), ...Array.from(componentItemFields)])
    // Log discovered fields for this section in a clear, human-friendly format
    console.log('---')
    console.log(`Section: ${t}`)
    if (itemFields.length === 0) {
      console.log('  fields: (none discovered)')
    } else {
      console.log('  fields:')
      for (const f of itemFields) console.log(`    - ${f}`)
    }
    const items = []
    for (let k = 0; k < itemsPerSection; k++) {
      // Start with default FPO item
      const base = makeFpoItemForType(t)
      // Add any missing fields found in template
      for (const f of itemFields) {
        if (!(f in base)) {
          // Provide FPO values for common field types
          if (f === 'readMoreText') base.readMoreText = 'Read more →'
          else if (f === 'readMoreLink') base.readMoreLink = 'https://example.com/readmore'
          else if (f === 'payWall') base.payWall = true
          else if (f === 'subtitle') base.subtitle = 'FPO subtitle'
          else if (f === 'image') base.image = 'https://dummyimage.com/800x1000/a4a4a6/fff&text=4x5'
          else base[f] = `FPO for item.${f}`
        }
      }
      items.push(base)
    }
    return {
      type: t,
      title: `FPO ${t} section title`,
      items
    }
  })

  // Alternate images across sections (and across items within a section)
  const IMG_4x5 = 'https://dummyimage.com/800x1000/a4a4a6/fff&text=4x5'
  const IMG_1x1 = 'https://dummyimage.com/800x800/a4a4a6/fff&text=1x1'
  sections.forEach((s, idx) => {
    const img = idx % 2 === 0 ? IMG_4x5 : IMG_1x1
    if (Array.isArray(s.items)) {
      s.items.forEach((it, j) => {
        // alternate items too if >1
        it.image = (j % 2 === 0) ? img : (img === IMG_4x5 ? IMG_1x1 : IMG_4x5)
      })
    }
  })

  // Put intro/header/sections into frontmatter (so md_to_json picks them up)
  front.intro = intro
  front.header = header
  front.sections = sections

  // Add footer block requested by user
  front.footer = {
    emailShare: "mailto:?subject=Newsletter%20Issue&body=Check%20out%20this%20issue%20of%20the%20Near%20Future%20Laboratory%20newsletter:%20https://nearfuturelaboratory.com/newsletters/2025/mdw43y25/",
    newsletterSubscribeLink: "https://nearfuturelaboratory.com/newsletter/",
    footerCta: {
      variant: "default",
    },
    logo: "https://imagedelivery.net/gaLGizR3kCgx5yRLtiRIOw/2d52e99e-69ae-467c-1e42-8c80b647df00/w=200?format=webp",
    logoLink: "https://nearfuturelaboratory.com",
    socialLinks: {
      applepodcasts: [
        { url: "https://podcasts.apple.com/us/podcast/near-future-laboratory-podcast/id1546452193", title: "Near Future Laboratory on Apple Podcasts" }
      ],
      spotify: [
        { url: "https://open.spotify.com/show/1vHzwGE5J19LvXSo8M93MM", title: "Near Future Laboratory on Spotify" }
      ],
      github: [
        { url: "https://github.com/bleeckerj", title: "Personal GitHub" },
        { url: "https://github.com/nearfuturelaboratory", title: "Near Future Laboratory GitHub" },
        { url: "https://github.com/nearfuturelaboratory", title: "Near Future Laboratory GitHub" }
      ],
      instagram: [
        { url: "https://instagram.com/darthjulian", title: "Personal Instagram" },
        { url: "https://instagram.com/nearfuturelaboratory", title: "Company Instagram" }
      ],
      linkedin: [
        { url: "https://linkedin.com/in/julianbleecker", title: "Personal LinkedIn" },
        { url: "https://www.linkedin.com/company/near-future-laboratory/", title: "Near Future Laboratory LinkedIn" }
      ],
      youtube: [
        { url: "https://youtube.com/@nearfuturelaboratory", title: "YouTube Channel" }
      ],
      discord: [
        { url: "https://patreon.com/nearfuturelaboratory", title: "Join Patreon to join the Discord Community" }
      ],
      patreon: [
        { url: "https://patreon.com/nearfuturelaboratory", title: "Support me on Patreon" }
      ],
      substack: [
        { url: "https://newsletter.substack.com", title: "Newsletter on Substack" }
      ]
    },
    unsubscribeLink: "[unsubscribe]",
    shareUrl: "https://nearfuturelaboratory.com/newsletters/2025/w43-y25",
    archiveUrl: "https://nearfuturelaboratory.com/newsletters",
    address: "© 2025 Near Future Laboratory<br>Venice Beach, California<br>United States",
    colophon: "The objects we consume and those that we surround ourselves with speak volumes about our hopes, fears, dreams, and dreads."
  }

  const outContent = '---\n' + renderYaml(front) + '\n---\n\n'
  const frontYaml = yaml.dump(front, { lineWidth: 1000 })
  const outFile = outPath ? path.resolve(outPath) : path.join(ROOT, 'generated', `${template}-sample.md`)
  await fs.mkdir(path.dirname(outFile), { recursive: true })
  await fs.writeFile(outFile, `---\n${frontYaml}---\n\n`, 'utf8')
  console.log(`Generated sample markdown: ${outFile}`)
}

async function run() {
  if (doBatch) {
    // list templates dir
    const dirents = await fs.readdir(path.join(ROOT, 'templates'), { withFileTypes: true })
    for (const d of dirents) {
      if (d.isDirectory()) {
        await generateForTemplate(d.name)
      }
    }
    return
  }

  await generateForTemplate(templateName)
}

run().catch(err => { console.error(err); process.exit(3) })

// (YAML generation now handled by js-yaml)
