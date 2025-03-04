#!/usr/bin/env bash
echo "\`test\`{.c}" | pandoc --highlight-style=pygments --template=scripts/highlight.css.tmpl > style/highlight.css
