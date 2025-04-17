EXCLUDE = --exclude "*webp" --exclude "*svg" --exclude "*gif" --exclude "saved-imgs"
IMG_DIR = ./static/images

mode ?= Debug

clean:
	rm -rf zig-out .zig-cache

build:
	zig build -Doptimize=$(mode)

qemu: build
	qemu-system-x86_64 -kernel zig-out/bin/my-kernel -no-reboot -no-shutdown -D /tmp/qemu.log

serve:
	hugo serve

fmt:
	zig fmt .

webp:
	fd -t f $(EXCLUDE) --full-path $(IMG_DIR) --exec convert {} {.}.webp \;
	fd -t f $(EXCLUDE) --full-path $(IMG_DIR) --exec rm {} \;

.PHONY: iso
iso:
	zig build
	cp zig-out/bin/my-kernel iso/boot/kernel.bin
	grub-mkrescue -o zig-out/zigos.iso iso
