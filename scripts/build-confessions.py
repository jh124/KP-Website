#!/usr/bin/env python3
"""Build comparison excerpts from the corrected Reader EPUB, using only stdlib.

The old framework supplies topic placement, never replacement prose. Every
paragraph's text and inline styling is transferred from the current EPUB.
The printed biblical-books table is checked token for token before reuse.
Uncertain matches stop the build; inspect the data diff after any source update.
"""
import json,re,html,xml.etree.ElementTree as ET,hashlib
from pathlib import Path
from zipfile import ZipFile
from html.parser import HTMLParser
from difflib import SequenceMatcher
from collections import defaultdict,Counter

class Fragment(HTMLParser):
 def __init__(self,text):
  super().__init__(convert_charrefs=True);self.root=ET.Element('root');self.stack=[self.root];self.feed(text)
 def handle_starttag(self,t,a):
  e=ET.SubElement(self.stack[-1],t,dict(a));self.stack.append(e)
 def handle_endtag(self,t):
  for i in range(len(self.stack)-1,0,-1):
   if self.stack[i].tag==t:self.stack=self.stack[:i];break
 def handle_data(self,t):
  e=self.stack[-1]
  if len(e):e[-1].tail=(e[-1].tail or '')+t
  else:e.text=(e.text or '')+t

def norm(t):
 t=t.replace('\ufffd','').replace('\u00ad','').translate(str.maketrans({'’':"'",'‘':"'",'“':'"','”':'"','–':'-','—':'-'}))
 return ' '.join(t.split())
def text(e):return ''.join(e.itertext())

def styled(e,style=0):
 tag=e.tag.split('}')[-1];style=style|(1 if tag in ('b','strong') else 2 if tag in ('i','em') else 0)
 if e.text:yield from ((c,style) for c in e.text)
 for child in e:
  yield from styled(child,style)
  if child.tail:yield from ((c,style) for c in child.tail)

class Group:
 def __init__(self,section,parent,conf):
  self.section=section;self.parent=parent;self.conf=conf;self.chars=[];self.styles=[];self.nodes=[]
 def add(self,e):
  if self.chars and self.chars[-1]!=' ':self.chars.append(' ');self.styles.append(0);self.nodes.append(-1)
  ni=max(self.nodes,default=-1)+1
  for c,style in styled(e):
   if c in ('\ufffd','\u00ad'):continue
   if c.isspace():
    if not self.chars or self.chars[-1]==' ':continue
    c=' '
   self.chars.append(c);self.styles.append(style);self.nodes.append(ni)
 def finish(self):
  self.display=''.join(self.chars);self.canonical=norm(self.display)
  # Whitespace has already been normalized; quote substitutions are one character each.
  assert len(self.canonical)==len(self.display.rstrip())
  self.tokens=list(re.finditer(r'\w+|[^\w\s]',self.canonical));self.words=[m.group() for m in self.tokens]
 def render(self,start,end):
  out=[];current=None;buf=[]
  for i in range(start,end):
   style=self.styles[i]
   if current is not None and style!=current:
    out.append(self.wrap(''.join(buf),current));buf=[]
   current=style;buf.append(self.chars[i])
  if buf:out.append(self.wrap(''.join(buf),current))
  return ''.join(out).strip()
 @staticmethod
 def wrap(s,style):
  s=html.escape(s)
  if style&2:s='<em>'+s+'</em>'
  if style&1:s='<strong>'+s+'</strong>'
  return s

def candidates_for(groups,old,parent):
 exact=[]
 for g in groups:
  p=g.canonical.find(old)
  if p>=0:exact.append((1.,g,p,p+len(old)))
 if exact:return max(exact,key=lambda x:x[1].parent==parent)
 words=re.findall(r'\w+|[^\w\s]',old);scores=[]
 preferred=[g for g in groups if g.parent==parent]
 pool=preferred or groups
 for g in pool:
  seq=SequenceMatcher(None,words,g.words,autojunk=False)
  bs=[b for b in seq.get_matching_blocks() if b.size];anchor=max(bs,key=lambda b:b.size)
  offset=anchor.b-anchor.a
  close=[b for b in bs if abs((b.b-b.a)-offset)<max(25,len(words)*.15)]
  first=min(close,key=lambda b:b.a);last=max(close,key=lambda b:b.a+b.size)
  start=max(0,first.b-first.a);end=min(len(g.words),last.b+last.size+len(words)-last.a-last.size)
  best=(0,start,end)
  for ds in range(-4,5):
   for de in range(-4,5):
    s,e=start+ds,end+de
    if s<0 or e>len(g.words) or e<=s:continue
    sm=SequenceMatcher(None,words,g.words[s:e],autojunk=False)
    if sm.quick_ratio()<best[0]:continue
    ratio=sm.ratio()
    if ratio>best[0]:best=(ratio,s,e)
  score,s,e=best
  scores.append((score,g,g.tokens[s].start(),g.tokens[e-1].end()))
 return max(scores,key=lambda x:(x[0],x[1].parent==parent))

from argparse import ArgumentParser

root = Path(__file__).resolve().parent.parent
parser = ArgumentParser(description="Transfer the corrected KP Reader into the comparison topic framework.")
parser.add_argument("--framework", type=Path, required=True, help="data.json from Reformed-Confessions-Comparison")
parser.add_argument("--epub", type=Path, default=root / "downloads/reformed-confessions-reader.epub")
parser.add_argument("--pdf", type=Path, default=root / "downloads/reformed-confessions-reader.pdf")
parser.add_argument("--output", type=Path, default=root / "data/confessions.json")
parser.add_argument("--audit", type=Path, help="Optional JSON transfer audit output")
args = parser.parse_args()

old=json.loads(args.framework.read_text());epub=args.epub;z=ZipFile(epub)
groups=[];byconf=defaultdict(list)
for section in sorted(n for n in z.namelist() if 'section-' in n):
 root=ET.fromstring(z.read(section));sec=root.find('.//{http://www.w3.org/1999/xhtml}section');parent=sec.attrib['aria-label'];g=None
 if parent.startswith('Appendix B'):
  g=Group(section,parent,'Westminster Shorter Catechism (1647)');groups.append(g);byconf[g.conf].append(g)
 for e in sec:
  tag=e.tag.split('}')[-1]
  if tag=='h2':
   g=Group(section,parent,text(e));groups.append(g);byconf[g.conf].append(g)
  elif tag!='h1' and g is not None:g.add(e)
for g in groups:g.finish()
new={'source':{'title':'A Topical Reader of the Reformed Confessions','edition':'Corrected Kidderminster Press edition','pdf':'../downloads/reformed-confessions-reader.pdf','pdfSha256':hashlib.sha256(args.pdf.read_bytes()).hexdigest(),'epubSha256':hashlib.sha256(epub.read_bytes()).hexdigest()},'confessions':old['confessions'],'topics':[]}
report=[];audit=[];total=Counter()
for ti,t in enumerate(old['topics']):
 nt={k:t[k] for k in ('topic','parent','sub')};nt['cells']={}
 for conf,raw in t['cells'].items():
  parsed=Fragment(raw).root;entries=[]
  for bi,e in enumerate(parsed):
   txt=norm(text(e))
   if not txt:continue
   kind=e.get('class','')
   if e.tag=='table':
    # The table is the same text, verified below; retain its two-column reading order.
    g=next(g for g in byconf[conf] if g.parent==t['parent'])
    s=g.canonical.index('Of the Old Testament:');en=g.canonical.index('The Revelation of John',s)+len('The Revelation of John')
    assert Counter(re.findall(r'\w+|[^\w\s]',norm(' '.join(''.join(d.itertext()) for d in e.iter('div')))))==Counter(re.findall(r'\w+|[^\w\s]',g.canonical[s:en]))
    entries.append({'html':ET.tostring(e,encoding='unicode',method='html'),'table':True});total['table']+=1;continue
   score,g,start,end=candidates_for(byconf[conf],txt,t['parent'])
   if score < 1:
    # Anchor the end in actual words. Duplicate stops in the old transcription must
    # not pull the next catechism question's initial Q into an answer.
    words_at_end = re.findall(r'\w+', txt)
    nearby = [m for m in re.finditer(r'\w+',g.canonical) if end-220 < m.start() < end+100]
    ends = []
    for tail_size in (4,3,2):
     tail = words_at_end[-tail_size:]
     ends = [nearby[j+len(tail)-1].end() for j in range(len(nearby)-len(tail)+1) if [m.group() for m in nearby[j:j+len(tail)]] == tail]
     if ends:break
    if ends:
     end = min(ends,key=lambda pos:abs(pos-end))
     while end < len(g.canonical) and not g.canonical[end].isspace() and not g.canonical[end].isalnum(): end += 1
    else:
     raise ValueError(f'End requires review: topic {ti}, {conf}, block {bi}')
   total['exact' if score==1 else 'corrected']+=1
   if score<.94:report.append({'topic':ti,'confession':conf,'block':bi,'score':score,'old':txt,'new':g.canonical[start:end],'source':g.parent})
   # Rejoin only page-fragment paragraphs, retaining deliberate labelled subdivisions.
   canjoin=entries and not entries[-1].get('table') and not kind and not entries[-1]['kind'] and entries[-1]['group'] is g and g.nodes[entries[-1]['end']-1]==g.nodes[start] and not re.match(r'^(?:[IVXLCDM]+\.|A\.)\s',txt) and not list(e)[0:1]
   if canjoin and norm(g.canonical[entries[-1]['end']:start])=='':entries[-1]['end']=end
   else:entries.append({'group':g,'start':start,'end':end,'kind':kind})
   audit.append({'topic':ti,'confession':conf,'block':bi,'section':g.section,'sourceGroup':groups.index(g),'start':start,'end':end,'score':score})
  rendered=[]
  for entry in entries:
   if entry.get('table'):rendered.append(entry['html']);continue
   g=entry['group'];body=g.render(entry['start'],entry['end']);kind=entry['kind']
   rendered.append('<p'+(' class="'+kind+'"' if kind else '')+'>'+body+'</p>')
  nt['cells'][conf]='\n'.join(rendered)
 # The corrected Reader includes HC Q22 here, newly copied into its creeds chapter.
 if ti==7:
  conf='Heidelberg Catechism (1563)';g=next(g for g in byconf[conf] if g.parent==t['parent'])
  end=g.canonical.index('Q.23.')
  qend=g.canonical.index('A.')
  nt['cells'][conf]='<p class="q">'+g.render(0,qend).strip()+'</p>\n<p class="a">'+g.render(qend,end).strip()+'</p>\n'+nt['cells'][conf]
 new['topics'].append(nt)
# Restore two clear omissions in the original tool's mapping, using only Reader text.
def source_passages(group, ranges):
 heading_end=group.canonical.index('CHRIST IS TRUE GOD.') if group.conf.startswith('Second Helvetic') else group.canonical.index('I. The light')
 parts=['<p class="lbl">'+group.render(0,heading_end).strip()+'</p>']
 for start_marker,end_marker in ranges:
  start=group.canonical.index(start_marker)
  end=group.canonical.index(end_marker,start) if end_marker else len(group.canonical)
  # Preserve the source's paragraph boundaries within the selected range.
  current=start
  for j in range(start+1,end):
   if group.nodes[j]!=group.nodes[j-1] and group.nodes[j]>=0:
    if group.canonical[current:j].strip():parts.append('<p>'+group.render(current,j).strip()+'</p>')
    current=j
  if group.canonical[current:end].strip():parts.append('<p>'+group.render(current,end).strip()+'</p>')
 return '\n'.join(parts)

shc='Second Helvetic Confession (1566)'
g=next(g for g in groups if g.section=='EPUB/section-013.xhtml' and g.conf==shc)
new['topics'][25]['cells'][shc]=source_passages(g,[('CHRIST IS TRUE GOD.','TWO NATURES IN CHRIST.'),('THE CREEDS OF FOUR COUNCILS RECEIVED.',None)])
new['topics'][26]['cells'][shc]=source_passages(g,[('TWO NATURES IN CHRIST.','OUR LORD TRULY SUFFERED.'),('IMPARTATION OF PROPERTIES.','CHRIST IS TRULY RISEN FROM THE DEAD.')])
new['topics'][27]['cells'][shc]=source_passages(g,[('JESUS CHRIST IS THE ONLY SAVIOR OF THE WORLD,','THE CREEDS OF FOUR COUNCILS RECEIVED.')])
fruit="THE FRUIT OF CHRIST'S DEATH AND RESURRECTION."
savior='JESUS CHRIST IS THE ONLY SAVIOR OF THE WORLD,'
new['topics'][29]['cells'][shc]=source_passages(g,[('OUR LORD TRULY SUFFERED.','IMPARTATION OF PROPERTIES.'),(fruit,savior)])
new['topics'][30]['cells'][shc]=source_passages(g,[('CHRIST IS TRULY RISEN FROM THE DEAD.',fruit),(fruit,savior)])
wcf='Westminster Confession (1646)'
g=next(g for g in groups if g.section=='EPUB/section-041.xhtml' and g.conf==wcf)
new['topics'][68]['cells'][wcf]=source_passages(g,[('III. Prayer,','IV. Prayer is to be made'),('IV. Prayer is to be made','V. The reading')])
dort='Canons of Dort (1619)'
g=next(g for g in groups if g.section=='EPUB/section-007.xhtml' and g.conf==dort)
heading='<p class="dorthead">'+g.render(0,g.canonical.index('Article 1')).strip()+'</p>\n'
for i in (12,13):new['topics'][i]['cells'][dort]=heading+new['topics'][i]['cells'][dort]
new['source']['mappingNotes']=[
 'Original 82-topic framework retained; HC Q22 included in the creeds topic as in the corrected Reader.',
 'Second Helvetic ch. 11 passages omitted by the original tool restored under the person, two natures, mediation, death, and resurrection of Christ.',
 'Westminster Confession 21.3-4 included under Prayer from the Reader worship chapter.',
 'The biblical-books table retains its printed column order; its words were checked against the corrected source.',
 'One unmapped PDF glyph, invisible in print, is omitted from the EPUB extraction.'
]
if report:
 raise ValueError("Source matches need review: " + json.dumps(report, ensure_ascii=False))
args.output.write_text(json.dumps(new, ensure_ascii=False, indent=2) + "\n")
if args.audit:
 args.audit.write_text(json.dumps(audit, ensure_ascii=False, indent=2) + "\n")
print(f"Built {len(new['topics'])} topics and {sum(len(t['cells']) for t in new['topics'])} excerpts from the corrected Reader.")
