const std = @import("std");

pub fn build(b: *std.Build) !void {
    const optimize = b.standardOptimizeOption(.{});
    const exe = b.addExecutable(.{
        .name = "my-kernel",
        .root_source_file = b.path("src/02-03.zig"),
        .target = b.resolveTargetQuery(.{
            .os_tag = .freestanding,
            .cpu_arch = .x86,
        }),
        .optimize = optimize,
    });
    exe.linker_script = b.path("src/linker.ld");
    b.installArtifact(exe);
}
