$ErrorActionPreference = "Stop"

$UnrarVersion = "723"
$UnrarUrl = "https://www.rarlab.com/rar/winrar-x64-$UnrarVersion.exe"

$BinariesDir = "src-tauri\binaries"
$TargetTriple = "x86_64-pc-windows-msvc"
$Dest = Join-Path $BinariesDir "unrar-$TargetTriple.exe"

if (Test-Path $Dest) {
    Write-Host "unrar sidecar sudah ada di $Dest, skip download."
    Write-Host "Hapus file itu manual kalau mau paksa re-download."
    exit 0
}

Write-Host "Menyiapkan unrar sidecar untuk Windows (WinRAR version: $UnrarVersion)..."

New-Item -ItemType Directory -Force -Path $BinariesDir | Out-Null

$TmpDir = Join-Path $env:TEMP "unrar-sidecar-$(Get-Random)"
New-Item -ItemType Directory -Force -Path $TmpDir | Out-Null

try {
    $InstallerPath = Join-Path $TmpDir "winrar-installer.exe"

    Write-Host "Downloading: $UnrarUrl"
    Invoke-WebRequest -Uri $UnrarUrl -OutFile $InstallerPath

    $sevenZip = Get-Command "7z" -ErrorAction SilentlyContinue

    if (-not $sevenZip) {
        throw "7z tidak ditemukan di PATH. Install 7-Zip dulu (winget install 7zip.7zip) atau tambahkan ke PATH."
    }

    $ExtractDir = Join-Path $TmpDir "extracted"

    Write-Host "Extracting WinRAR installer..."

    & 7z x $InstallerPath "-o$ExtractDir" -y | Out-Null

    if ($LASTEXITCODE -ne 0) {
        throw "Gagal mengekstrak WinRAR installer dengan 7-Zip."
    }

    $UnrarExe = Get-ChildItem `
        -Path $ExtractDir `
        -Filter "UnRAR.exe" `
        -Recurse `
        -File |
        Select-Object -First 1

    if (-not $UnrarExe) {
        throw "UnRAR.exe tidak ditemukan hasil extract. Cek struktur installer WinRAR."
    }

    Copy-Item $UnrarExe.FullName $Dest -Force

    Write-Host ""
    Write-Host "Selesai."
    Write-Host "Sidecar tersedia di: $Dest"
}
finally {
    Remove-Item -Recurse -Force $TmpDir -ErrorAction SilentlyContinue
}