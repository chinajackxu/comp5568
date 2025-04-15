# PowerShell 测试脚本

# 设置颜色输出
$GREEN = [System.Console]::ForegroundColor = [System.ConsoleColor]::Green
$YELLOW = [System.Console]::ForegroundColor = [System.ConsoleColor]::Yellow
$RED = [System.Console]::ForegroundColor = [System.ConsoleColor]::Red
$NC = [System.Console]::ResetColor()

function Write-ColorOutput($ForegroundColor) {
    $fc = [System.Console]::ForegroundColor
    [System.Console]::ForegroundColor = $ForegroundColor
    if ($args) {
        Write-Output $args
    }
    else {
        $input | Write-Output
    }
    [System.Console]::ForegroundColor = $fc
}

Write-ColorOutput Yellow "开始测试 OnlyDex 合约系统..."
Write-ColorOutput Yellow "====================================="

# 编译合约
Write-ColorOutput Yellow "编译合约..."
npx hardhat compile
if ($LASTEXITCODE -ne 0) {
    Write-ColorOutput Red "编译失败，终止测试"
    exit 1
}
Write-ColorOutput Green "编译成功!`n"

# 运行所有测试
Write-ColorOutput Yellow "运行所有测试..."
npx hardhat test
if ($LASTEXITCODE -ne 0) {
    Write-ColorOutput Red "测试失败"
    exit 1
}
Write-ColorOutput Green "所有测试通过!`n"

# 运行覆盖率测试 (如果安装了 solidity-coverage)
$packageJson = Get-Content -Path "package.json" -Raw | ConvertFrom-Json
if ($packageJson.devDependencies -and $packageJson.devDependencies."solidity-coverage") {
    Write-ColorOutput Yellow "运行测试覆盖率分析..."
    npx hardhat coverage
    if ($LASTEXITCODE -ne 0) {
        Write-ColorOutput Red "覆盖率测试失败"
        exit 1
    }
    Write-ColorOutput Green "覆盖率测试完成!`n"
}

Write-ColorOutput Green "测试完成!"
Write-ColorOutput Yellow "=====================================" 