#!/usr/bin/env python3
"""Build the comparison from exact Reader passages and an explicit topic map."""
from argparse import ArgumentParser
from collections import Counter
from hashlib import sha256
from html import unescape
from pathlib import Path
import json
import re
import fitz
from reader_source import (
    DOCUMENTS, BOOKLIST_HTML, groups_from_epub, fragments_from_groups,
    canonical_fragments, letters, normal,
)

ROOT = Path(__file__).resolve().parent.parent
parser = ArgumentParser(description=__doc__)
parser.add_argument('--output', type=Path, default=ROOT / 'data/confessions-v2.json')
parser.add_argument('--audit', type=Path)
args = parser.parse_args()
epub = ROOT / 'downloads/reformed-confessions-reader.epub'
pdf_path = ROOT / 'downloads/reformed-confessions-reader.pdf'
groups = groups_from_epub(epub)
fragments, issues = fragments_from_groups(groups)
bank, conflicts = canonical_fragments(fragments)
if issues or conflicts:
    raise ValueError(f'Source extraction requires review: {issues} {conflicts}')
topics = json.loads((ROOT / 'data/confession-topics.json').read_text())
def natural(value):
    return [int(part) if part.isdigit() else part for part in re.split(r'(\d+)', value)]
def expand(selector):
    if selector.endswith('.*'):
        result = sorted([key for key in bank if key.startswith(selector[:-1])], key=natural)
        if not result: raise ValueError(f'Empty selector: {selector}')
        return result
    match = re.fullmatch(r'(.+\.)([ar]?)(\d+)-([ar]?)(\d+)', selector)
    if match:
        prefix, kind, start, second_kind, end = match.groups()
        if second_kind and kind != second_kind: raise ValueError(f'Invalid range: {selector}')
        return [f'{prefix}{kind}{i}' for i in range(int(start), int(end)+1)]
    return [selector]
for topic in topics:
    topic['passages'] = [key for selector in topic['selectors'] for key in expand(selector)]
    if len(set(topic['passages'])) != len(topic['passages']): raise ValueError(f'Duplicate passage in {topic["id"]}')
used = {key for topic in topics for key in topic['passages']}
if used != set(bank):
    raise ValueError(f'Unmapped: {set(bank)-used}; unknown references: {used-set(bank)}')

pdf = fitz.open(pdf_path)
toc = pdf.get_toc()
page_text = [letters(page.get_text()) for page in pdf]
approximate = []
def source_page(fragment):
    index = fragment.group.section - 1
    start = toc[index][2]
    end = toc[index+1][2]-1 if index+1 < len(toc) else len(pdf)
    words = letters(fragment.text).split()
    for length in (10, 7, 4):
        needle = ' '.join(words[:length])
        for page in range(start, end+1):
            if needle and needle in page_text[page-1]:
                return page
    # A heading occasionally straddles page boundaries; use its opening body words.
    if fragment.label_end:
        body = fragment.group.text[fragment.label_end:fragment.end]
        for length in (8, 5):
            needle = ' '.join(letters(body).split()[:length])
            for page in range(start, end+1):
                if needle and needle in page_text[page-1]:
                    return page
    approximate.append(fragment.key)
    return start

passages = {}
for key, fragment in bank.items():
    body = fragment.html()
    if key == 'wcf.1.2':
        group = fragment.group
        start = group.text.index('Of the Old Testament:', fragment.start, fragment.end)
        end = group.text.index('The Revelation of John', start, fragment.end) + len('The Revelation of John')
        divs = re.findall(r'<div[^>]*>(.*?)</div>', BOOKLIST_HTML)
        printed = unescape(' '.join(re.sub('<[^>]+>', '', d) for d in divs))
        assert Counter(re.findall(r'\w+|[^\w\s]', printed)) == Counter(re.findall(r'\w+|[^\w\s]', group.text[start:end]))
        body = group.html(fragment.start, start) + '\n' + BOOKLIST_HTML + '\n' + group.html(end, fragment.end)
    passages[key] = {
        'document': fragment.group.document,
        'ref': fragment.ref,
        'heading': fragment.heading,
        'chapterHeading': fragment.chapter_heading,
        'html': body,
        'page': source_page(fragment),
    }

GROUP_ORDER = [
    'Foundations', 'Holy Scripture', 'God and his works', 'Man, sin, and the covenants',
    'The person and work of Christ', 'Salvation in Christ', 'The law of God',
    'The church', 'The means of grace', 'Worship', 'Prayer',
    'Christian life and society', 'The last things', 'Historical texts',
]
topics.sort(key=lambda t: GROUP_ORDER.index(t['group']))
for topic in topics:
    cells = {}
    for document, *_ in DOCUMENTS:
        refs = [key for key in topic['passages'] if passages[key]['document'] == document]
        if refs:
            cells[document] = refs
    topic['cells'] = cells
    del topic['passages']
    del topic['selectors']

# Keep the first publication's shared URLs usable after topic merges and renaming.
LEGACY_IDS = [
 'prefaces','chief-end-and-comfort','revelation','canon','scripture-authority','scripture-sufficiency','scripture-interpretation','creeds',
 'god-being-and-attributes','god-being-and-attributes','trinity','decree','election','reprobation','creation-world','creation-angels','creation-man','providence',
 'fall','original-sin','actual-sin','free-will','covenant-works','covenant-grace','covenant-grace','christ-person','christ-two-natures','christ-mediator','christ-offices',
 'christ-atonement','christ-exaltation','christ-intercession','law-nature','law-use','ten-commandments','law-nature','first-commandment','second-commandment','third-commandment','sabbath',
 'fifth-commandment','sixth-commandment','seventh-commandment','eighth-commandment','ninth-commandment','tenth-commandment','gospel-offer','word-read-and-preached','effectual-calling',
 'saving-faith','justification','adoption','repentance','sanctification','perseverance','assurance','church-nature','church-marks','church-authority','ministry','communion-saints',
 'sacraments','baptism','lords-supper','worship','images','sabbath','singing-language','prayer','christian-liberty','oaths-vows','celibacy-monasticism','marriage-family','civil-magistrate',
 'property','death','resurrection','last-judgment','eternal-life','burial-purgatory','catechesis','conclusions',
]
legacy_path = ROOT / 'data/confession-legacy-topics.json'
legacy_titles = json.loads(legacy_path.read_text())
def slug(value):
    return re.sub(r'[^a-z0-9]+', '-', value.lower().replace("'", '').replace('’','')).strip('-')
assert len(LEGACY_IDS) == len(legacy_titles)
legacy = {slug(title): target for title, target in zip(legacy_titles, LEGACY_IDS)}
result = {
    'version': 2,
    'source': {
        'title': 'A Topical Reader of the Reformed Confessions',
        'pdfSha256': sha256(pdf_path.read_bytes()).hexdigest(),
        'epubSha256': sha256(epub.read_bytes()).hexdigest(),
        'passageCount': len(passages),
    },
    'documents': [{'id': key, 'name': name, 'shortName': short, 'abbreviation': abbr} for key,name,short,abbr in DOCUMENTS],
    'groups': GROUP_ORDER,
    'legacyTopics': legacy,
    'topics': topics,
    'passages': passages,
}
args.output.write_text(json.dumps(result, ensure_ascii=False, separators=(',', ':')) + '\n')
if args.audit:
    args.audit.write_text(json.dumps({'topics': len(topics), 'passages': len(passages), 'approximatePages': approximate},indent=2)+'\n')
print(f'Built {len(topics)} reviewed topics, {len(passages)} exact source passages, {sum(len(t["cells"]) for t in topics)} comparisons.')
if approximate:
    print('Page anchors requiring review:', ', '.join(approximate))
