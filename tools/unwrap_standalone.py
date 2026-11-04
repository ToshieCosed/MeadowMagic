"""Reverse of build_standalone.py: usage  python tools/unwrap_standalone.py release/strata-standalone.html src/strata.html"""
import sys,pathlib
pre=('<!doctype html><html lang="en"><head><meta charset="utf-8">'
     '<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover">'
     '<meta name="theme-color" content="#1b2230">\n<style>html,body{margin:0;padding:0}[hidden]{display:none!important}</style>')
t=pathlib.Path(sys.argv[1]).read_text(encoding='utf-8')
assert t.startswith(pre),'prefix mismatch'
t=t[len(pre):]; assert t.endswith('</body></html>'); t=t[:-len('</body></html>')]
j=t.index('</style>')+8; assert t[j:j+13]=='</head><body>'
pathlib.Path(sys.argv[2]).write_text(t[:j]+t[j+13:],encoding='utf-8')
