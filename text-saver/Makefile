CHROME_DST = /tmp/text-saver-chrome.zip
FIREFOX_DST = /tmp/text-saver-firefox.zip

build: buildc buildf

lint:
	npx prettier@2.7.1 --write .

buildc:
	rm -f $(CHROME_DST)
	cd src && zip -r $(CHROME_DST) *

buildf:
	rm -f $(FIREFOX_DST)
	node build.mjs
	cd src && zip -r $(FIREFOX_DST) *
	git checkout -- src/manifest.json
