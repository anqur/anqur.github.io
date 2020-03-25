import argparse
import subprocess as sp
from pathlib import Path

# Why not `asyncio`?  You are thinking peach!  That's not parallelism!
from multiprocessing import Process, JoinableQueue, Lock, Value

_INPUT_PATHS = [Path("."), *Path("post").iterdir()]


def collector(pending_items, lock, total, is_force):
    for post in _INPUT_PATHS:
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


def generator(pending_items, lock, done, total, tmpl):
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

    args = p.parse_args()

    tmpl = None
    with open(Path("scripts") / "template.html") as f:
        tmpl = f.read()

    pending_items = JoinableQueue()
    lock = Lock()
    done, total = Value("i", 0), Value("i", 0)

    coll = Process(
        target=collector, args=(pending_items, lock, total, args.force)
    )
    gens = [
        Process(
            target=generator, args=(pending_items, lock, done, total, tmpl)
        )
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
