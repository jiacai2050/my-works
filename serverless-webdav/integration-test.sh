#!/bin/bash

# 配置
BASE_URL="http://127.0.0.1:8787"
USER="admin"
PASS="123"

# 颜色
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

echo "==========================================="
echo "WebDAV 测试开始"
echo "目标: $BASE_URL"
echo "用户: $USER"
echo "==========================================="

# 辅助函数
run_test() {
    local name="$1"
    local method="$2"
    local path="$3"
    local expect="$4"
    shift 4
    # remaining args are in "$@"

    echo -n "测试 [${method}] $name ... "

    # 运行 curl 获取 HTTP 状态码
    # "$@" 必须加引号以保留参数中的空格（如 headers）
    code=$(curl -s -o /dev/null -w "%{http_code}" -X "$method" -u "$USER:$PASS" "$BASE_URL$path" "$@")

    if [ "$code" == "$expect" ]; then
        echo -e "${GREEN}通过${NC} ($code)"
    else
        echo -e "${RED}失败${NC} (预期 $expect, 实际 $code)"
    fi
}

# 准备测试文件
echo "Hello WebDAV" > test_file.txt

# 1. 检查服务存活 (OPTIONS)
run_test "服务可用性" "OPTIONS" "/" "200"

# 2. 创建目录 (MKCOL)
run_test "创建目录 /demo" "MKCOL" "/demo" "201"

# 3. 上传文件 (PUT)
run_test "上传文件 /demo/hello.txt" "PUT" "/demo/hello.txt" "201" --data-binary @test_file.txt

# 4. 下载验证 (GET)
echo -n "测试 [GET] 下载内容验证 ... "
content=$(curl -s -X GET -u "$USER:$PASS" "$BASE_URL/demo/hello.txt")
if [ "$content" == "Hello WebDAV" ]; then
    echo -e "${GREEN}通过${NC}"
else
    echo -e "${RED}失败${NC} (内容不匹配: '$content')"
fi

# 5. 列出目录 (PROPFIND)
run_test "列出目录 /demo" "PROPFIND" "/demo" "207" -H "Depth: 1"

# 6. 复制文件 (COPY)
run_test "复制文件 -> /demo/copy.txt" "COPY" "/demo/hello.txt" "201" -H "Destination: /demo/copy.txt"

# 7. 移动/重命名文件 (MOVE)
run_test "移动文件 -> /demo/moved.txt" "MOVE" "/demo/copy.txt" "201" -H "Destination: /demo/moved.txt"

# 8. 验证移动结果 (HEAD)
run_test "检查旧文件不存在" "HEAD" "/demo/copy.txt" "404"
run_test "检查新文件存在" "HEAD" "/demo/moved.txt" "200"

# 9. 删除文件 (DELETE)
run_test "删除文件 /demo/moved.txt" "DELETE" "/demo/moved.txt" "204"

# 10. 删除非空目录 (递归删除测试)
# 先确保还有个文件
curl -s -X PUT -u "$USER:$PASS" "$BASE_URL/demo/remain.txt" --data "remain" > /dev/null
run_test "删除非空目录 /demo" "DELETE" "/demo" "204"

# 11. 验证彻底删除
run_test "验证根目录清理" "HEAD" "/demo" "404"

# 清理本地文件
rm test_file.txt

echo "==========================================="
echo "测试完成"
