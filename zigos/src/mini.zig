const std = @import("std");
const fmt = std.fmt;
const mem = std.mem;
const Writer = std.io.Writer;

usingnamespace @import("./multiboot.zig");

const VGA_WIDTH = 80;
const VGA_HEIGHT = 25;
const VGA_SIZE = VGA_WIDTH * VGA_HEIGHT;

/// Enumeration of VGA Text Mode supported colors.
pub const Colors = enum(u8) {
    Black = 0,
    Blue = 1,
    Green = 2,
    Cyan = 3,
    Red = 4,
    Magenta = 5,
    Brown = 6,
    LightGray = 7,
    DarkGray = 8,
    LightBlue = 9,
    LightGreen = 10,
    LightCyan = 11,
    LightRed = 12,
    LightMagenta = 13,
    LightBrown = 14,
    White = 15,
};

/// The current cursor row position.
var row: usize = 0;

/// The current cursor column position.
var column: usize = 0;

/// The current color active foreground and background colors.
var color = vgaEntryColor(Colors.LightGray, Colors.Black);

/// Direct memory access to the VGA Text buffer.
var buffer: *volatile [VGA_HEIGHT][VGA_WIDTH]u16 = @ptrFromInt(0xB8000);

/// Create a VGA color from a foreground and background Colors enum.
fn vgaEntryColor(fg: Colors, bg: Colors) u8 {
    return @intFromEnum(fg) | (@intFromEnum(bg) << 4);
}

/// Create a VGA character entry from a character and a color
fn vgaEntry(uc: u8, newColor: u8) u16 {
    const c: u16 = newColor;
    return uc | (c << 8);
}

/// Prints a single character
pub fn putChar(c: u8) void {
    buffer[row][column] = vgaEntry(c, color);

    column += 1;
    if (column == VGA_WIDTH) {
        column = 0;
        row += 1;
        if (row == VGA_HEIGHT)
            row = 0;
    }
}

pub fn putString(str: []const u8) void {
    for (str) |c| {
        putChar(c);
    }
}

pub var writer = Writer(void, error{}, callback){ .context = {} };

fn callback(_: void, string: []const u8) error{}!usize {
    putString(string);
    return string.len;
}

pub fn printf(comptime format: []const u8, args: anytype) void {
    fmt.format(writer, format, args) catch unreachable;
}

export fn _start() callconv(.Naked) noreturn {
    asm volatile (
        \\ push %ebp
        \\ jmp %[start:P]
        :
        : [start] "X" (&main),
    );
}

fn main() void {
    putString("hello world");
    printf("hello-{d}", .{123});
    // while(true) {}
}

pub fn panic(msg: []const u8, error_return_trace: ?*std.builtin.StackTrace, ret_addr: ?usize) noreturn {
    _ = ret_addr;
    _ = error_return_trace;

    for (msg) |c| {
        putChar(c);
    }

    while (true) {}
}
