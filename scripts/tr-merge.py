import json,sys
tsv,lang=sys.argv[1],sys.argv[2]
P=__import__('os').path.join(__import__('os').path.dirname(__file__),'..','src','config','translations-manual.json')
m=json.load(open(P,encoding='utf-8'));n=0
for line in open(tsv,encoding='utf-8'):
  line=line.rstrip('\n')
  if '\t' not in line: continue
  k,t=line.split('\t',1); m[lang][k.strip()]=t.replace(' ⏎ ','\n').strip(); n+=1
json.dump(m,open(P,'w',encoding='utf-8'),ensure_ascii=False,indent=0,sort_keys=True)
print('merged',n,'total',{l:len(v) for l,v in m.items()})
