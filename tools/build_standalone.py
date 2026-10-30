"""Wrap src/strata.html (artifact page body) into a full standalone HTML document."""
import pathlib
root=pathlib.Path(__file__).resolve().parent.parent
s=(root/'src/strata.html').read_text()
j=s.index('</style>')+8
out=('<!doctype html><html lang="en"><head><meta charset="utf-8">'
     '<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover">'
     '<meta name="theme-color" content="#1b2230">\n<style>html,body{margin:0;padding:0}[hidden]{display:none!important}</style>'
     +s[:j]+'</head><body>'+s[j:]+'</body></html>')
for p in ['release/strata-standalone.html','index.html']: (root/p).write_text(out)
print('built', len(out), 'bytes')
