"""Exact, reference-based extraction of the corrected Topical Reader.

References and subheadings come from the EPUB; all prose remains source text.
The PDF provides page locations and verifies the recovered two-column book list.
"""
from __future__ import annotations

from collections import Counter, defaultdict
from dataclasses import dataclass
from html import escape
from pathlib import Path
import re
import xml.etree.ElementTree as ET
from zipfile import ZipFile

DOCUMENTS = [
    ('ac', 'Augsburg Confession (1530)', 'Augsburg Confession', 'AC'),
    ('fc', 'French Confession of Faith (1559)', 'French Confession', 'French'),
    ('sc', 'Scots Confession (1560)', 'Scots Confession', 'Scots'),
    ('bc', 'Belgic Confession (1561)', 'Belgic Confession', 'BC'),
    ('hc', 'Heidelberg Catechism (1563)', 'Heidelberg Catechism', 'HC'),
    ('shc', 'Second Helvetic Confession (1566)', 'Second Helvetic', '2HC'),
    ('39a', 'Thirty-Nine Articles (1571)', 'Thirty-Nine Articles', '39A'),
    ('dort', 'Canons of Dort (1619)', 'Canons of Dort', 'Dort'),
    ('wcf', 'Westminster Confession (1646)', 'Westminster Confession', 'WCF'),
    ('wlc', 'Westminster Larger Catechism (1647)', 'Westminster Larger Catechism', 'WLC'),
    ('wsc', 'Westminster Shorter Catechism (1647)', 'Westminster Shorter Catechism', 'WSC'),
]
BY_NAME = {name: key for key, name, _, _ in DOCUMENTS}
NS = '{http://www.w3.org/1999/xhtml}'


def normal(text):
    return ' '.join(text.replace('\u00ad', '').replace('\ufffd', '').split())


def letters(text):
    return ' '.join(re.findall(r'\w+', normal(text))).casefold()


def styled(element, style=0):
    tag = element.tag.split('}')[-1]
    style |= 1 if tag in ('strong', 'b') else 2 if tag in ('em', 'i') else 0
    if element.text:
        yield from ((c, style) for c in element.text)
    for child in element:
        yield from styled(child, style)
        if child.tail:
            yield from ((c, style) for c in child.tail)


class Group:
    def __init__(self, document, section, title):
        self.document, self.section, self.title = document, section, title
        self.chars, self.styles, self.nodes, self.tags = [], [], [], []

    def add(self, element):
        if self.chars and self.chars[-1] != ' ':
            self.chars.append(' '); self.styles.append(0); self.nodes.append(-1)
        node = len(self.tags)
        self.tags.append(element.tag.split('}')[-1])
        for char, style in styled(element):
            if char in ('\u00ad', '\ufffd'):
                continue
            if char.isspace():
                if not self.chars or self.chars[-1] == ' ':
                    continue
                char = ' '
            self.chars.append(char); self.styles.append(style); self.nodes.append(node)

    def finish(self):
        self.text = ''.join(self.chars).rstrip()

    def inline(self, start, end):
        output, buffer, current = [], [], None
        for i in range(start, end):
            style = self.styles[i]
            if current is not None and current != style:
                output.append(self.wrap(''.join(buffer), current)); buffer = []
            current = style; buffer.append(self.chars[i])
        if buffer:
            output.append(self.wrap(''.join(buffer), current))
        return ''.join(output).strip()

    @staticmethod
    def wrap(value, style):
        value = escape(value)
        if style & 2:
            value = '<em>' + value + '</em>'
        if style & 1:
            value = '<strong>' + value + '</strong>'
        return value

    def paragraphs(self, start, end):
        boundaries = [start]
        for i in range(start + 1, end):
            if self.nodes[i] >= 0 and self.nodes[i] != self.nodes[i - 1]:
                boundaries.append(i)
        boundaries.append(end)
        return [(a, b) for a, b in zip(boundaries, boundaries[1:]) if self.text[a:b].strip()]

    def html(self, start, end, kind=''):
        result = []
        for a, b in self.paragraphs(start, end):
            content = self.inline(a, b)
            if content:
                cls = ' class="' + kind + '"' if kind else (' class="a"' if self.text[a:b].lstrip().startswith('A.') else '')
                result.append('<p' + cls + '>' + content + '</p>')
        return '\n'.join(result)


def groups_from_epub(epub):
    groups = []
    with ZipFile(epub) as archive:
        for filename in sorted(n for n in archive.namelist() if re.search(r'/section-\d+\.xhtml$', n)):
            root = ET.fromstring(archive.read(filename))
            section = root.find('.//' + NS + 'section')
            number = int(re.search(r'section-(\d+)', filename)[1])
            title = section.attrib['aria-label']
            group = None
            if title.startswith('Appendix B'):
                group = Group('wsc', number, title); groups.append(group)
            for element in section:
                tag = element.tag.split('}')[-1]
                if tag == 'h2':
                    name = ''.join(element.itertext())
                    group = Group(BY_NAME[name], number, title); groups.append(group)
                elif tag != 'h1' and group is not None:
                    group.add(element)
    for group in groups:
        group.finish()
    return groups


def reference_starts(group):
    prefix = 'Q' if group.document in ('hc', 'wlc', 'wsc') else 'Ch' if group.document in ('wcf', 'shc', 'sc') else 'Art'
    matches = [m for m in re.finditer(r'\b' + prefix + r'\.\s*(\d+)\b', group.text) if group.styles[m.start()] & 1]
    return matches


def label_end(group, start, end):
    node = group.nodes[start]
    node_end = start
    while node_end < end and group.nodes[node_end] == node:
        node_end += 1
    stop = node_end
    # Some extracted headings contain body prose in the same XML element.
    for i in range(start, node_end):
        if group.text[i].isalnum() and not group.styles[i] & 1:
            stop = i; break
    if group.document == 'shc':
        caps = re.search(r"\b[A-Z][A-Z\u2019',()\[\]\-:; ]{2,}[.?!]", group.text[start:end])
        if caps:
            first_caps = start + caps.start()
            if first_caps < node_end or group.text[node_end:first_caps].strip().startswith('Of '):
                return first_caps
        return node_end
    return stop


ROMAN = {'I': 1, 'II': 2, 'III': 3, 'IV': 4, 'V': 5, 'VI': 6, 'VII': 7, 'VIII': 8, 'IX': 9, 'X': 10}


@dataclass
class Fragment:
    key: str
    group: Group
    start: int
    end: int
    heading: str
    ref: str
    chapter_heading: str = ''
    label_end: int | None = None

    @property
    def text(self):
        return self.group.text[self.start:self.end].strip()

    def html(self):
        if self.label_end is not None:
            kind = 'q' if self.group.document in ('hc', 'wlc', 'wsc') else 'lbl'
            label = self.group.inline(self.start, self.label_end)
            return '<p class="' + kind + '">' + label + '</p>\n' + self.group.html(self.label_end, self.end)
        return self.group.html(self.start, self.end)


def fragments_from_groups(groups):
    fragments = []
    issues = []
    for group in groups:
        doc = group.document
        if doc == 'dort':
            head_match = re.search(r'(First|Second|Third and Fourth|Fifth) Head of Doctrine', group.text)
            head = {'First': '1', 'Second': '2', 'Third and Fourth': '3', 'Fifth': '5'}.get(head_match[1]) if head_match else None
            if head:
                labels = [m for m in re.finditer(r'\b(Article|Rejection)\s+(\d+)\b', group.text) if group.styles[m.start()] & 1]
                for i, match in enumerate(labels):
                    end = labels[i+1].start() if i+1 < len(labels) else len(group.text)
                    prefix = 'a' if match[1] == 'Article' else 'r'
                    # Rejection-section introductions are retained as their own unit.
                    split = group.text.find('Rejection of Errors', match.end(), end)
                    if split >= 0:
                        end = split
                    reference = f'Head {head}, {match[1]} {match[2]}'
                    fragments.append(Fragment(f'dort.{head}.{prefix}{match[2]}', group, match.start(), end, reference, reference, label_end=match.end()))
                intro = group.text.find('Rejection of Errors')
                first_rejection = next((m.start() for m in labels if m[1] == 'Rejection'), None)
                if intro >= 0 and first_rejection and first_rejection > intro:
                    fragments.append(Fragment(f'dort.{head}.errors', group, intro, first_rejection, 'Rejection of Errors', f'Head {head}, Rejection of Errors'))
            else:
                fragments.append(Fragment('dort.conclusion', group, 0, len(group.text), 'Conclusion', 'Conclusion'))
            continue
        matches = reference_starts(group)
        if not matches:
            label = 'conclusion' if 'Conclusions' in group.title else 'preface'
            fragments.append(Fragment(f'{doc}.{label}', group, 0, len(group.text), label.title(), label.title()))
            continue
        for i, match in enumerate(matches):
            number = int(match[1]); start = match.start(); end = matches[i+1].start() if i+1 < len(matches) else len(group.text)
            body = label_end(group, start, end)
            title = group.text[start:body].strip()
            if doc == 'wcf':
                roman = [m for m in re.finditer(r'\b([IVX]{1,4})\.\s+(?=[A-Z“\"])', group.text[body:end]) if m[1] in ROMAN]
                for j, part in enumerate(roman):
                    a = body + part.start(); b = body + roman[j+1].start() if j+1 < len(roman) else end
                    key = f'wcf.{number}.{ROMAN[part[1]]}'
                    fragments.append(Fragment(key, group, a, b, title, f'Ch. {number}.{ROMAN[part[1]]}', title))
                if not roman:
                    fragments.append(Fragment(f'wcf.{number}.1', group, body, end, title, f'Ch. {number}', title))
            elif doc == 'shc':
                caps = list(re.finditer(r'\b[A-Z][A-Z\u2019\',()\[\]\-:; ]{2,}[.?!]', group.text[body:end]))
                for j, part in enumerate(caps):
                    a = body + part.start(); b = body + caps[j+1].start() if j+1 < len(caps) else end
                    fragments.append(Fragment(f'shc.{number}.{j+1}', group, a, b, part[0], f'Ch. {number}', title))
                if not caps:
                    fragments.append(Fragment(f'shc.{number}.1', group, body, end, title, f'Ch. {number}', title))
                elif caps[0].start() > 2:
                    fragments.append(Fragment(f'shc.{number}.0', group, body, body+caps[0].start(), 'Introduction', f'Ch. {number}', title))
            else:
                prefix = 'Q.' if doc in ('hc', 'wlc', 'wsc') else 'Ch.' if doc == 'sc' else 'Art.'
                fragments.append(Fragment(f'{doc}.{number}', group, start, end, title, f'{prefix} {number}', label_end=body))
    return fragments, issues


def canonical_fragments(fragments):
    variants = defaultdict(list)
    for fragment in fragments:
        variants[fragment.key].append(fragment)
    canonical, conflicts = {}, []
    for key, items in variants.items():
        longest = max(items, key=lambda f: len(f.text))
        for item in items:
            if normal(item.text) not in normal(longest.text):
                conflicts.append((key, len(item.text), len(longest.text), item.text[:160], longest.text[:160]))
        canonical[key] = longest
    saints = canonical['ac.21']
    transition = saints.group.text.find('This is about the Sum of our Doctrine', saints.start, saints.end)
    if transition < 0:
        raise ValueError('Augsburg doctrinal transition requires review')
    canonical['ac.transition'] = Fragment('ac.transition', saints.group, transition, saints.end, 'Doctrinal summary and introduction to the corrected abuses', 'Doctrinal summary')
    saints.end = transition
    return canonical, conflicts


BOOKLIST_HTML = '<table class="booklist"><tr><td><div class="bl bl-head">Of the Old Testament:</div><div class="bl bl-item">Genesis</div><div class="bl bl-item">Exodus</div><div class="bl bl-item">Leviticus</div><div class="bl bl-item">Numbers</div><div class="bl bl-item">Deuteronomy</div><div class="bl bl-item">Joshua</div><div class="bl bl-item">Judges</div><div class="bl bl-item">Ruth</div><div class="bl bl-item">I Samuel</div><div class="bl bl-item">II Samuel</div><div class="bl bl-item">I Kings</div><div class="bl bl-item">II Kings</div><div class="bl bl-item">I Chronicles</div><div class="bl bl-item">II Chronicles</div><div class="bl bl-item">Ezra</div><div class="bl bl-item">Nehemiah</div><div class="bl bl-item">Esther</div><div class="bl bl-item">Job</div><div class="bl bl-item">Psalms</div><div class="bl bl-item">Proverbs</div><div class="bl bl-item">Ecclesiastes</div><div class="bl bl-item">The Song of Songs</div><div class="bl bl-item">Isaiah</div><div class="bl bl-item">Jeremiah</div><div class="bl bl-item">Lamentations</div><div class="bl bl-item">Ezekiel</div><div class="bl bl-item">Daniel</div><div class="bl bl-item">Hosea</div><div class="bl bl-item">Joel</div><div class="bl bl-item">Amos</div><div class="bl bl-item">Obadiah</div><div class="bl bl-item">Jonah</div></td><td><div class="bl bl-item">Micah</div><div class="bl bl-item">Nahum</div><div class="bl bl-item">Habakkuk</div><div class="bl bl-item">Zephaniah</div><div class="bl bl-item">Haggai</div><div class="bl bl-item">Zechariah</div><div class="bl bl-item">Malachi;</div><div class="bl bl-head">Of the New Testament:</div><div class="bl bl-sub">The Gospels according to</div><div class="bl bl-subitem">Matthew</div><div class="bl bl-subitem">Mark</div><div class="bl bl-subitem">Luke</div><div class="bl bl-subitem">John</div><div class="bl bl-item">The Acts of the Apostles</div><div class="bl bl-sub">Paul\'s Epistles to the</div><div class="bl bl-subitem">Romans</div><div class="bl bl-subitem">Corinthians I</div><div class="bl bl-subitem">Corinthians II</div><div class="bl bl-subitem">Galatians</div><div class="bl bl-subitem">Ephesians</div><div class="bl bl-subitem">Philippians</div><div class="bl bl-subitem">Colossians</div><div class="bl bl-subitem">Thessalonians I</div><div class="bl bl-subitem">Thessalonians II</div><div class="bl bl-subitem">To Timothy I</div><div class="bl bl-subitem">To Timothy II</div><div class="bl bl-subitem">To Titus</div><div class="bl bl-subitem">To Philemon</div><div class="bl bl-item">The Epistle to the Hebrews</div><div class="bl bl-item">The Epistle of James</div><div class="bl bl-item">The first and second Epistles of Peter</div><div class="bl bl-item">The first, second, and third Epistles of John</div><div class="bl bl-item">The Epistle of Jude</div><div class="bl bl-item">The Revelation of John</div></td></tr></table>'
