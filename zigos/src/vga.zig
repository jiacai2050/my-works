const std = @import("std");
const fmt = std.fmt;
const mem = std.mem;

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
var vga_array: *volatile [VGA_HEIGHT][VGA_WIDTH]u16 = @ptrFromInt(0xB8000);

/// Create a VGA color from a foreground and background Colors enum.
fn vgaEntryColor(fg: Colors, bg: Colors) u8 {
    return @intFromEnum(fg) | (@intFromEnum(bg) << 4);
}

/// Create a VGA character entry from a character and a color
fn vgaEntry(uc: u8, newColor: u8) u16 {
    const c: u16 = newColor;
    return uc | (c << 8);
}

/// Set the active colors.
pub fn setColors(fg: Colors, bg: Colors) void {
    color = vgaEntryColor(fg, bg);
}

/// Set the active foreground color.
pub fn setForegroundColor(fg: Colors) void {
    color = (0xF0 & color) | @intFromEnum(fg);
}

/// Set the active background color.
pub fn setBackgroundColor(bg: Colors) void {
    color = (0x0F & color) | (@intFromEnum(bg) << 4);
}

/// Clear the screen using the active background color as the color to be painted.
pub fn clear() void {
    for (0..VGA_HEIGHT) |r| {
        for (0..VGA_WIDTH) |c| {
            vga_array[r][c] = vgaEntry(' ', color);
        }
    }
}

/// Sets the current cursor location.
pub fn setLocation(new_row: u8, new_col: u8) void {
    row = new_row;
    column = new_col;
}

/// Prints a single character
pub fn putChar(c: u8) void {
    vga_array[row][column] = vgaEntry(c, color);

    column += 1;
    if (column == VGA_WIDTH) {
        column = 0;
        row += 1;
        if (row == VGA_HEIGHT)
            row = 0;
    }
}

pub fn putString(data: []const u8) void {
    for (data) |c| {
        putChar(c);
    }
}

pub const writer = std.io.GenericWriter(void, error{}, callback){ .context = {} };

fn callback(_: void, string: []const u8) error{}!usize {
    putString(string);
    return string.len;
}

pub fn printf(comptime format: []const u8, args: anytype) void {
    fmt.format(writer, format, args) catch unreachable;
}
