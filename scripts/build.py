import argparse
import subprocess as sp
from pathlib import Path

def collect(is_force):
    pending_items = []

    for post in [Path("."), *Path("post").iterdir()]:
        if not post.is_dir():
            continue

        for infile in post.iterdir():
            if infile.name != "index.md":
                continue

            outfile = infile.with_name("index.html")
            if outfile.exists() and not is_force:
                continue

            pending_items.append((infile, outfile))

    return pending_items

def generate(pending_items):
    total = len(pending_items)
    done = 0

    tmpl = None
    with open(Path("scripts") / "template.html") as f:
        tmpl = f.read()

    for infile, outfile in pending_items:
        body = None

        with open(infile) as f:
            body = sp.run(["pandoc", "--mathjax", "-f", "markdown-smart"],
                stdin=f, capture_output=True).stdout.decode("utf-8").replace("\r", "")

        with open(outfile, "w", encoding="utf-8") as f:
            f.write(tmpl.format(body=body))

        done += 1
        print(f"{done}/{total}")

def main():
    P = argparse.ArgumentParser()
    P.add_argument(
        "--force",
        "-f",
        action='store_true',
        help="Force building all posts",
    )
    P.add_argument(
        "--jobs",
        "-j",
        type=int,
        default=4,
        help="Number of jobs",
    )

    args = P.parse_args()

    print("Collecting...")
    pending_items = collect(args.force)

    print("Generating...")
    generate(pending_items)

    print("Job done!")

if __name__ == "__main__":
    main()
