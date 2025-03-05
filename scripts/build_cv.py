"""
Generate CV web page for printing
"""

import subprocess as sp
from pathlib import Path

_CV_PATH = Path("post") / "cv" / "index.md"
_TMPLFILE_PATH = Path("template") / "cv.html"
_OUT_PATH = Path("out")
_OUTFILE_PATH = _OUT_PATH / "cv.html"


def main():
    with open(_CV_PATH) as f:
        body = (
            sp.run(
                ["pandoc", "--mathjax", "-f", "gfm"],
                stdin=f,
                capture_output=True,
            )
            .stdout.decode("utf-8")
            .replace("\r", "")
        )

    tmpl = None
    with open(_TMPLFILE_PATH) as f:
        tmpl = f.read()

    _OUT_PATH.mkdir(exist_ok=True)
    with open(_OUTFILE_PATH, "w", encoding="utf-8") as f:
        f.write(tmpl.format(body=body))


if __name__ == "__main__":
    main()
