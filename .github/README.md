# Blog

Too long, didn't write.

## Dependency

* Pandoc
* Python

## Notes

I got a legacy blog site that everything is totally based on JavaScript:
fetching the Markdown posts, rendering on the fly, and `insertAdjacentHTMl`-ing
for the win.  But the dependency bot just can't stop yelling at me for those
insecure JS modules, which I have no ideas what they actually fuel my site.

I decided to use Pandoc, and some trivial Python scripts, to statically generate
all the stuff.

## License

ISC
