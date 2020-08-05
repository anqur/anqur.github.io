import argparse
import subprocess as sp
from pathlib import Path

# Why not `asyncio`?  You are thinking peach!  That's not parallelism!
from multiprocessing import Process, JoinableQueue, Value

_INPUT_PATHS = [
    Path("."),
    *Path("post").iterdir(),
    *(Path("post") / "legacy").iterdir(),
]


def collector(input_paths, pending_items, total, is_force):
    for post in input_paths:
        if not post.is_dir():
            continue

        for infile in post.iterdir():
            if infile.name != "index.md":
                continue

            outfile = infile.with_name("index.html")
            if outfile.exists() and not is_force:
                continue

            pending_items.put((infile, outfile))
            total.value += 1


def generator(pending_items, done, total, tmpl):
    while True:
        infile, outfile = pending_items.get()

        body = None
        with open(infile) as f:
            body = (
                sp.run(
                    ["pandoc", "--mathjax", "-f", "markdown-smart"],
                    stdin=f,
                    capture_output=True,
                )
                .stdout.decode("utf-8")
                .replace("\r", "")
            )

        with open(outfile, "w", encoding="utf-8") as f:
            f.write(tmpl.format(body=body))

        pending_items.task_done()

        done.value += 1
        print(f"{done.value}/{total.value}")


def main():
    p = argparse.ArgumentParser()
    p.add_argument(
        "--force", "-f", action="store_true", help="Force building all posts",
    )
    p.add_argument(
        "--jobs", "-j", type=int, default=4, help="Number of jobs",
    )
    p.add_argument("--input-path", "-i", help="A single path as input")

    args = p.parse_args()

    tmpl = None
    with open(Path("scripts") / "template.html") as f:
        tmpl = f.read()

    input_paths = [Path(args.input_path)] if args.input_path else _INPUT_PATHS
    pending_items = JoinableQueue()
    done, total = Value("i", 0), Value("i", 0)

    coll = Process(
        target=collector, args=(input_paths, pending_items, total, args.force),
    )
    gens = [
        Process(target=generator, args=(pending_items, done, total, tmpl))
        for _ in range(args.jobs)
    ]

    print("Collecting...")
    coll.start()
    coll.join()
    print(f"{done.value}/{total.value}")

    print("Generating...")
    for g in gens:
        g.daemon = True
        g.start()

    pending_items.join()
    print("Job done!")


if __name__ == "__main__":
    main()
