# Internal Blog Theory

My personal blog.

## Dependency

* Pandoc
* Python

## Debug/Build

Create an HTTP server for debugging, I prefer Python's handy `http.sever`.

```bash
$ python -m http.server
# Serving port 8000...
```

You have plenty of ways to build the blog:

* Build everything:

```bash
# Don't touch the already generated posts.
$ python ./scripts/build.py
# Forcibly all posts.
$ python ./scripts/build.py -f
```

* Build the directory of a specific post:

```bash
# Build it, if it's not generated yet.
$ python ./scripts/build.py -i ./post/2000-01-01-xxx/
# Build it forcibly.
$ python ./scripts/build.py -i ./post/2000-01-01-xxx/ -f
```

* Build more concurrently:

```bash
# By default, build with 8 jobs.
$ python ./scripts/build.py
# Let's goooooooooooo.
$ python ./scripts/build.py -j 16
```

## Notes

I got a legacy blog site that everything is totally based on JavaScript: fetching the Markdown posts, rendering on the
fly, and `insertAdjacentHTMl`-ing for the win. But the dependency bot just can't stop yelling at me for those insecure
JS modules, which I have no ideas how they actually fuel my site.

I decided to use Pandoc, and some trivial Python scripts, to statically generate all the stuff.

## License

ISC
