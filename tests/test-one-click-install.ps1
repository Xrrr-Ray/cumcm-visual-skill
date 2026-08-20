[CmdletBinding()]
param(
  [string]$PackageRoot = ""
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

if ([string]::IsNullOrWhiteSpace($PackageRoot)) {
  $PackageRoot = [System.IO.Path]::GetFullPath((Split-Path -Parent $PSScriptRoot))
} else {
  $PackageRoot = [System.IO.Path]::GetFullPath($PackageRoot)
}

$installer = Join-Path $PackageRoot "scripts\install-cumcm-visual-skill.ps1"
if (-not (Test-Path -LiteralPath $installer -PathType Leaf)) {
  throw "找不到安装脚本：$installer"
}

$testRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("cumcm-skill-install-test-" + [guid]::NewGuid().ToString("N"))
$destinationRoot = Join-Path $testRoot "skills"

try {
  & $installer -Action Install -DestinationRoot $destinationRoot
  if ($LASTEXITCODE -ne 0) {
    throw "Install 返回退出码 $LASTEXITCODE"
  }

  $installedPath = Join-Path $destinationRoot "cumcm-figure-skill"
  foreach ($item in @("SKILL.md", "VERSION", "agents\openai.yaml", "install-manifest.json")) {
    if (-not (Test-Path -LiteralPath (Join-Path $installedPath $item))) {
      throw "安装结果缺少：$item"
    }
  }

  & $installer -Action Status -DestinationRoot $destinationRoot
  if ($LASTEXITCODE -ne 0) {
    throw "Status 返回退出码 $LASTEXITCODE"
  }

  & $installer -Action Install -DestinationRoot $destinationRoot -Force
  if ($LASTEXITCODE -ne 0) {
    throw "Force reinstall 返回退出码 $LASTEXITCODE"
  }

  $backupRoot = Join-Path $destinationRoot ".cumcm-figure-skill-backups"
  if (-not (Test-Path -LiteralPath $backupRoot -PathType Container)) {
    throw "覆盖安装后没有生成备份目录。"
  }

  & $installer -Action Uninstall -DestinationRoot $destinationRoot
  if ($LASTEXITCODE -ne 0) {
    throw "Uninstall 返回退出码 $LASTEXITCODE"
  }
  if (Test-Path -LiteralPath $installedPath) {
    throw "卸载后安装目录仍然存在。"
  }

  Write-Host "PASS：一键安装、状态检查、覆盖更新和可恢复卸载均通过。" -ForegroundColor Green
} finally {
  if (Test-Path -LiteralPath $testRoot) {
    Remove-Item -LiteralPath $testRoot -Recurse -Force
  }
}
