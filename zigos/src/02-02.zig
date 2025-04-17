const std = @import("std");

// 定义多重引导头结构
const MultibootHeader = extern struct {
    magic: u32,
    flags: u32,
    checksum: u32,
};

// 多重引导魔数常量
const MULTIBOOT_MAGIC: i64 = 0x1BADB002;
const ALIGN: u32 = 1 << 0;
const MEMINFO: u32 = 1 << 1;
const MULTIBOOT_FLAGS: i64 = @intCast(ALIGN | MEMINFO);

// 声明多重引导头
export var multiboot_header align(4) linksection(".multiboot") = MultibootHeader{
    .magic = @intCast(MULTIBOOT_MAGIC),
    .flags = @intCast(MULTIBOOT_FLAGS),
    .checksum = @intCast((-(MULTIBOOT_MAGIC + MULTIBOOT_FLAGS)) & 0xFFFFFFFF),
};

// 内核主函数
export fn _start() callconv(.Naked) noreturn {
    // Direct memory access to the VGA Text buffer.
    var buffer: [*]volatile u8 = @ptrFromInt(0xB8000);
    const msg = "Hello World!";
    for (msg, 0..) |c, i| {
        buffer[i *% 2] = c;
        buffer[i *% 2 +% 1] = 0xb;
    }

    // 死循环
    while (true) {}
}
