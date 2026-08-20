[CmdletBinding()]
param(
  [ValidateSet("Install", "Update", "Status", "Uninstall")]
  [string]$Action = "Install",

  [string]$DestinationRoot = "",

  [switch]$Force
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

try {
  [Console]::InputEncoding = [System.Text.UTF8Encoding]::new($false)
  [Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
} catch {
  # 某些旧版 PowerShell 主机不允许修改控制台编码，不影响安装。
}

$skillName = "cumcm-visual-skill"
$sourceRoot = [System.IO.Path]::GetFullPath((Split-Path -Parent $PSScriptRoot))

function Get-FullPath {
  param([Parameter(Mandatory = $true)][string]$Path)
  return [System.IO.Path]::GetFullPath($Path)
}

function Assert-ChildPath {
  param(
    [Parameter(Mandatory = $true)][string]$Parent,
    [Parameter(Mandatory = $true)][string]$Child
  )

  $parentFull = (Get-FullPath $Parent).TrimEnd([char[]]@("\", "/"))
  $childFull = Get-FullPath $Child
  $prefix = $parentFull + [System.IO.Path]::DirectorySeparatorChar
  if (-not $childFull.StartsWith($prefix, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw "安全检查失败：目标路径不在预期目录内：$childFull"
  }
}

function Get-PackageVersion {
  param([Parameter(Mandatory = $true)][string]$Root)
  $versionFile = Join-Path $Root "VERSION"
  if (-not (Test-Path -LiteralPath $versionFile -PathType Leaf)) {
    throw "安装包缺少 VERSION：$versionFile"
  }
  $value = (Get-Content -LiteralPath $versionFile -Raw -Encoding UTF8).Trim()
  if ($value -notmatch "^\d+\.\d+\.\d+([-.][0-9A-Za-z.-]+)?$") {
    throw "VERSION 格式无效：$value"
  }
  return $value
}

function Test-SkillPackage {
  param([Parameter(Mandatory = $true)][string]$Root)

  $required = @(
    "SKILL.md",
    "VERSION",
    "agents\openai.yaml",
    "scripts\generate-paper-visual.mjs",
    "scripts\generate-paper-chart.mjs",
    "scripts\generate-model-diagram.mjs",
    "scripts\plan-figure-suite.mjs",
    "references\paper-visual-workflow.md"
  )
  foreach ($item in $required) {
    $path = Join-Path $Root $item
    if (-not (Test-Path -LiteralPath $path)) {
      throw "Skill 包校验失败，缺少：$item"
    }
  }

  $skillText = Get-Content -LiteralPath (Join-Path $Root "SKILL.md") -Raw -Encoding UTF8
  if ($skillText -notmatch "(?m)^name:\s*cumcm-visual-skill\s*$") {
    throw "SKILL.md 中的 name 不是 cumcm-visual-skill。"
  }

  [void](Get-PackageVersion -Root $Root)
  return $true
}

function Get-DefaultDestinationRoot {
  $profilePath = [Environment]::GetFolderPath([Environment+SpecialFolder]::UserProfile)
  if ([string]::IsNullOrWhiteSpace($profilePath)) {
    $profilePath = $env:USERPROFILE
  }
  if ([string]::IsNullOrWhiteSpace($profilePath)) {
    throw "无法确定当前用户目录，请通过 -DestinationRoot 指定安装位置。"
  }
  return Join-Path $profilePath ".agents\skills"
}

function Get-InstalledVersion {
  param([Parameter(Mandatory = $true)][string]$SkillPath)
  $versionFile = Join-Path $SkillPath "VERSION"
  if (-not (Test-Path -LiteralPath $versionFile -PathType Leaf)) {
    return "未知版本"
  }
  return (Get-Content -LiteralPath $versionFile -Raw -Encoding UTF8).Trim()
}

function Show-EnvironmentSummary {
  Write-Host ""
  Write-Host "环境检查（安装 Skill 本身不要求这些依赖全部存在）：" -ForegroundColor Cyan
  foreach ($command in @("node", "python", "kimi")) {
    $resolved = Get-Command $command -ErrorAction SilentlyContinue
    if ($null -eq $resolved) {
      Write-Host "  - ${command}：未检测到" -ForegroundColor DarkYellow
      continue
    }

    try {
      $version = (& $command --version 2>$null | Select-Object -First 1)
      Write-Host "  - ${command}：$version" -ForegroundColor DarkGreen
    } catch {
      Write-Host "  - ${command}：已检测到，但无法读取版本" -ForegroundColor DarkYellow
    }
  }
}

if ([string]::IsNullOrWhiteSpace($DestinationRoot)) {
  $DestinationRoot = Get-DefaultDestinationRoot
}

$destinationRootFull = Get-FullPath $DestinationRoot
$destinationPath = Join-Path $destinationRootFull $skillName
$backupRoot = Join-Path $destinationRootFull ".cumcm-visual-skill-backups"
$stagePath = $null
Assert-ChildPath -Parent $destinationRootFull -Child $destinationPath
Assert-ChildPath -Parent $destinationRootFull -Child $backupRoot

try {
  if ($Action -eq "Status") {
    Write-Host "CUMCM Visual Skill 安装状态" -ForegroundColor Cyan
    Write-Host "  目标目录：$destinationPath"
    if (-not (Test-Path -LiteralPath $destinationPath -PathType Container)) {
      Write-Host "  状态：尚未安装" -ForegroundColor DarkYellow
      exit 1
    }
    [void](Test-SkillPackage -Root $destinationPath)
    Write-Host "  状态：已安装且结构有效" -ForegroundColor Green
    Write-Host "  版本：$(Get-InstalledVersion -SkillPath $destinationPath)"
    exit 0
  }

  if ($Action -eq "Uninstall") {
    if (-not (Test-Path -LiteralPath $destinationPath -PathType Container)) {
      Write-Host "未找到已安装的 CUMCM Visual Skill，无需卸载。" -ForegroundColor DarkYellow
      exit 0
    }

    New-Item -ItemType Directory -Path $backupRoot -Force | Out-Null
    $stamp = Get-Date -Format "yyyyMMdd-HHmmss-fff"
    $installedVersion = Get-InstalledVersion -SkillPath $destinationPath
    $safeInstalledVersion = $installedVersion -replace "[^0-9A-Za-z._-]", "_"
    $backupPath = Join-Path $backupRoot "$skillName-$safeInstalledVersion-uninstalled-$stamp"
    Assert-ChildPath -Parent $backupRoot -Child $backupPath
    Move-Item -LiteralPath $destinationPath -Destination $backupPath
    Write-Host "已卸载 CUMCM Visual Skill。" -ForegroundColor Green
    Write-Host "原文件已保留在：$backupPath"
    Write-Host "重新打开 Codex 后，Skill 将不再出现在可用列表中。"
    exit 0
  }

  [void](Test-SkillPackage -Root $sourceRoot)
  $packageVersion = Get-PackageVersion -Root $sourceRoot
  $installedVersion = if (Test-Path -LiteralPath $destinationPath -PathType Container) {
    Get-InstalledVersion -SkillPath $destinationPath
  } else {
    $null
  }

  if (($null -ne $installedVersion) -and ($installedVersion -eq $packageVersion) -and (-not $Force)) {
    Write-Host "CUMCM Visual Skill v$packageVersion 已安装，无需重复安装。" -ForegroundColor Green
    Write-Host "安装位置：$destinationPath"
    Write-Host "如需覆盖重装，请运行脚本并增加 -Force。"
    Show-EnvironmentSummary
    exit 0
  }

  New-Item -ItemType Directory -Path $destinationRootFull -Force | Out-Null
  $stagePath = Join-Path $destinationRootFull (".installing-$skillName-" + [guid]::NewGuid().ToString("N"))
  Assert-ChildPath -Parent $destinationRootFull -Child $stagePath
  New-Item -ItemType Directory -Path $stagePath | Out-Null

  $packageFiles = @(
    ".clawscan-allow",
    "LICENSE",
    "README.md",
    "README.zh-CN.md",
    "SKILL.md",
    "VERSION",
    "安装数模Skill.cmd",
    "检查安装状态.cmd",
    "卸载数模Skill.cmd"
  )
  $packageDirectories = @(
    "agents",
    "assets",
    "components",
    "docs",
    "examples",
    "exporters",
    "figure-suite",
    "model-diagram",
    "paper-chart",
    "paper-visual",
    "planner",
    "providers",
    "references",
    "schemas",
    "scripts",
    "templates",
    "validators"
  )

  foreach ($item in $packageFiles) {
    $source = Join-Path $sourceRoot $item
    if (Test-Path -LiteralPath $source -PathType Leaf) {
      Copy-Item -LiteralPath $source -Destination $stagePath
    }
  }
  foreach ($item in $packageDirectories) {
    $source = Join-Path $sourceRoot $item
    if (-not (Test-Path -LiteralPath $source -PathType Container)) {
      throw "安装包缺少目录：$item"
    }
    Copy-Item -LiteralPath $source -Destination $stagePath -Recurse
  }

  [void](Test-SkillPackage -Root $stagePath)
  $manifest = [ordered]@{
    skill = $skillName
    version = $packageVersion
    installed_at = (Get-Date).ToString("o")
    source = $sourceRoot
    destination = $destinationPath
  }
  $manifest | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $stagePath "install-manifest.json") -Encoding UTF8

  $backupPath = $null
  if (Test-Path -LiteralPath $destinationPath -PathType Container) {
    New-Item -ItemType Directory -Path $backupRoot -Force | Out-Null
    $stamp = Get-Date -Format "yyyyMMdd-HHmmss-fff"
    $safeInstalledVersion = $installedVersion -replace "[^0-9A-Za-z._-]", "_"
    $backupPath = Join-Path $backupRoot "$skillName-$safeInstalledVersion-$stamp"
    Assert-ChildPath -Parent $backupRoot -Child $backupPath
    Move-Item -LiteralPath $destinationPath -Destination $backupPath
  }

  try {
    Move-Item -LiteralPath $stagePath -Destination $destinationPath
    [void](Test-SkillPackage -Root $destinationPath)
  } catch {
    if (Test-Path -LiteralPath $destinationPath) {
      Remove-Item -LiteralPath $destinationPath -Recurse -Force
    }
    if (($null -ne $backupPath) -and (Test-Path -LiteralPath $backupPath)) {
      Move-Item -LiteralPath $backupPath -Destination $destinationPath
    }
    throw
  }

  $verb = if ($null -eq $installedVersion) { "安装" } else { "更新" }
  Write-Host "CUMCM Visual Skill v$packageVersion ${verb}成功。" -ForegroundColor Green
  Write-Host "安装位置：$destinationPath"
  if ($null -ne $backupPath) {
    Write-Host "旧版本备份：$backupPath"
  }
  Write-Host "现在可在 Codex 中直接说：使用 `$cumcm-visual-skill 生成一张数模论文技术路线图。"
  Write-Host "Codex 通常会自动发现新 Skill；若列表尚未刷新，请重新打开 Codex。"
  Show-EnvironmentSummary
  exit 0
} catch {
  Write-Host "安装操作失败：$($_.Exception.Message)" -ForegroundColor Red
  exit 1
} finally {
  if (($null -ne $stagePath) -and (Test-Path -LiteralPath $stagePath)) {
    Assert-ChildPath -Parent $destinationRootFull -Child $stagePath
    Remove-Item -LiteralPath $stagePath -Recurse -Force
  }
}
