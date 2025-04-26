CHROME_DST = /tmp/gooreplacer-chrome.zip
FIREFOX_DST = /tmp/gooreplacer-firefox.zip

build: buildc buildf

buildc:
	rm -f $(CHROME_DST)
	cd src && zip -r $(CHROME_DST) *

buildf:
	rm -f $(FIREFOX_DST)
	node build.mjs
	cd src && zip -r $(FIREFOX_DST) *
	git checkout -- src/manifest.json
