#!/bin/bash

# 设置颜色输出
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}开始测试 OnlyDex 合约系统...${NC}"
echo -e "${YELLOW}=====================================${NC}"

# 编译合约
echo -e "${YELLOW}编译合约...${NC}"
npx hardhat compile
if [ $? -ne 0 ]; then
  echo -e "${RED}编译失败，终止测试${NC}"
  exit 1
fi
echo -e "${GREEN}编译成功!${NC}\n"

# 运行所有测试
echo -e "${YELLOW}运行所有测试...${NC}"
npx hardhat test
if [ $? -ne 0 ]; then
  echo -e "${RED}测试失败${NC}"
  exit 1
fi
echo -e "${GREEN}所有测试通过!${NC}\n"

# 运行覆盖率测试 (如果安装了 solidity-coverage)
if npm list | grep -q "solidity-coverage"; then
  echo -e "${YELLOW}运行测试覆盖率分析...${NC}"
  npx hardhat coverage
  if [ $? -ne 0 ]; then
    echo -e "${RED}覆盖率测试失败${NC}"
    exit 1
  fi
  echo -e "${GREEN}覆盖率测试完成!${NC}\n"
fi

echo -e "${GREEN}测试完成!${NC}"
echo -e "${YELLOW}=====================================${NC}" 