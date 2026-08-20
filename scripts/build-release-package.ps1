[CmdletBinding()]
param(
  [string]$Output = ""
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$sourceRoot = [System.IO.Path]::GetFullPath((Split-Path -Parent $PSScriptRoot))
if ([string]::IsNullOrWhiteSpace($Output)) {
  $Output = Join-Path $sourceRoot "site\public\downloads\cumcm-figure-skill-one-click.zip"
} elseif (-not [System.IO.Path]::IsPathRooted($Output)) {
  $Output = Join-Path $sourceRoot $Output
}
$outputFull = [System.IO.Path]::GetFullPath($Output)
$outputDirectory = Split-Path -Parent $outputFull

$stagingRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("cumcm-release-" + [guid]::NewGuid().ToString("N"))
$packageRoot = Join-Path $stagingRoot "cumcm-figure-skill"
$temporaryZip = Join-Path ([System.IO.Path]::GetTempPath()) ("cumcm-release-" + [guid]::NewGuid().ToString("N") + ".zip")

$rootFiles = @(
  ".clawscan-allow",
  "DEVELOPMENT.md",
  "LICENSE",
  "README.md",
  "README.zh-CN.md",
  "SKILL.md",
  "VERSION"
)

$directories = @(
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
  "tests",
  "validators"
)

try {
  New-Item -ItemType Directory -Path $packageRoot -Force | Out-Null

  foreach ($item in $rootFiles) {
    $source = Join-Path $sourceRoot $item
    if (-not (Test-Path -LiteralPath $source -PathType Leaf)) {
      throw "Missing required release file: $item"
    }
    Copy-Item -LiteralPath $source -Destination $packageRoot
  }

  Get-ChildItem -LiteralPath $sourceRoot -Filter "*.cmd" -File | ForEach-Object {
    Copy-Item -LiteralPath $_.FullName -Destination $packageRoot
  }

  foreach ($item in $directories) {
    $source = Join-Path $sourceRoot $item
    if (-not (Test-Path -LiteralPath $source -PathType Container)) {
      throw "Missing required release directory: $item"
    }
    Copy-Item -LiteralPath $source -Destination $packageRoot -Recurse
  }

  Add-Type -AssemblyName System.IO.Compression.FileSystem
  [System.IO.Compression.ZipFile]::CreateFromDirectory(
    $stagingRoot,
    $temporaryZip,
    [System.IO.Compression.CompressionLevel]::Optimal,
    $false
  )

  $archive = [System.IO.Compression.ZipFile]::OpenRead($temporaryZip)
  try {
    $entryNames = @($archive.Entries | ForEach-Object { $_.FullName.Replace("/", "\") })
    foreach ($requiredEntry in @(
      "cumcm-figure-skill\SKILL.md",
      "cumcm-figure-skill\VERSION",
      "cumcm-figure-skill\agents\openai.yaml",
      "cumcm-figure-skill\scripts\install-cumcm-visual-skill.ps1"
    )) {
      if ($entryNames -notcontains $requiredEntry) {
        throw "Release archive validation failed: $requiredEntry"
      }
    }
    if (@($entryNames | Where-Object { $_ -like "cumcm-figure-skill\.git\*" -or $_ -like "cumcm-figure-skill\site\*" }).Count -gt 0) {
      throw "Release archive contains excluded repository files."
    }
  } finally {
    $archive.Dispose()
  }

  New-Item -ItemType Directory -Path $outputDirectory -Force | Out-Null
  Move-Item -LiteralPath $temporaryZip -Destination $outputFull -Force
  $hash = (Get-FileHash -LiteralPath $outputFull -Algorithm SHA256).Hash.ToLowerInvariant()
  Set-Content -LiteralPath ($outputFull + ".sha256") -Value "$hash  $([System.IO.Path]::GetFileName($outputFull))" -Encoding ASCII

  Write-Host "Release package created: $outputFull"
  Write-Host "SHA256: $hash"
} finally {
  if (Test-Path -LiteralPath $stagingRoot) {
    Remove-Item -LiteralPath $stagingRoot -Recurse -Force
  }
  if (Test-Path -LiteralPath $temporaryZip) {
    Remove-Item -LiteralPath $temporaryZip -Force
  }
}
