const std = @import("std");

// 定义多重引导头结构
const MultibootHeader = extern struct {
    magic: u32,
    architecture: u32 = 0, // i386
    header_length: u32,
    checksum: u32,
};

// 多重引导魔数常量
const MULTIBOOT_MAGIC: i64 = 0xE85250D6;
const ALIGN: u32 = 1 << 0;
const MEMINFO: u32 = 1 << 1;
const MULTIBOOT_FLAGS: i64 = @intCast(ALIGN | MEMINFO);
const HEADER_LENGTH: i64 = @sizeOf(MultibootHeader);

// 声明多重引导头
export var multiboot_header align(8) linksection(".multiboot") = MultibootHeader{
    .magic = @intCast(MULTIBOOT_MAGIC),
    .header_length = @intCast(HEADER_LENGTH),
    .checksum = @intCast((-(MULTIBOOT_MAGIC + HEADER_LENGTH)) & 0xFFFFFFFF),
};
