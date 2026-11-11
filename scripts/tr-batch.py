# Hand translation helpers: python scripts/tr-batch.py <dir with todo.json> <from> <to> [lang]  → prints key<TAB>text
import json,sys
S=sys.argv[1];a,b=int(sys.argv[2]),int(sys.argv[3])
d=json.load(open(S+'/todo.json',encoding='utf-8'))[sys.argv[4] if len(sys.argv)>4 else 'uk']
for i in d[a:b]: print(i['k']+'\t'+i['s'].replace('\n',' ⏎ '))
