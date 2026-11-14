# Gera o ícone do Windows em múltiplas resoluções a partir da logo TurboDown.

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$icoPath   = Join-Path $scriptDir "assets\icon.ico"
$logoPath  = Join-Path $scriptDir "assets\turbodown-logo.png"

Add-Type -AssemblyName System.Drawing

if (-not (Test-Path $logoPath)) {
    throw "Logo TurboDown não encontrada: $logoPath"
}

Write-Host ""
Write-Host "  Criando assets\icon.ico a partir de assets\turbodown-logo.png..." -ForegroundColor Cyan

Add-Type @'
using System;
using System.Runtime.InteropServices;

public static class TurboDownIconHandle
{
    [DllImport("user32.dll")]
    public static extern bool DestroyIcon(IntPtr iconHandle);
}
'@

$source = [System.Drawing.Image]::FromFile($logoPath)
$sizes = @(256, 128, 64, 48, 32, 16)
$iconImages = New-Object System.Collections.ArrayList

try {
    foreach ($size in $sizes) {
        $bitmap = New-Object System.Drawing.Bitmap($size, $size)
        $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
        $memoryStream = New-Object System.IO.MemoryStream
        $icon = $null
        $iconHandle = [IntPtr]::Zero

        try {
            $graphics.Clear([System.Drawing.Color]::Transparent)
            $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
            $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
            $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
            $graphics.DrawImage($source, 0, 0, $size, $size)

            $iconHandle = $bitmap.GetHicon()
            $icon = [System.Drawing.Icon]::FromHandle($iconHandle)
            $icon.Save($memoryStream)

            $iconBytes = $memoryStream.ToArray()
            $imageLength = [int][BitConverter]::ToUInt32($iconBytes, 14)
            $imageOffset = [int][BitConverter]::ToUInt32($iconBytes, 18)
            $image = New-Object byte[] $imageLength
            [Array]::Copy($iconBytes, $imageOffset, $image, 0, $imageLength)
            [void]$iconImages.Add($image)
        } finally {
            if ($icon) { $icon.Dispose() }
            if ($iconHandle -ne [IntPtr]::Zero) {
                [void][TurboDownIconHandle]::DestroyIcon($iconHandle)
            }
            $memoryStream.Dispose()
            $graphics.Dispose()
            $bitmap.Dispose()
        }
    }

    $fileStream = New-Object System.IO.FileStream(
        $icoPath,
        [System.IO.FileMode]::Create,
        [System.IO.FileAccess]::Write
    )
    $writer = New-Object System.IO.BinaryWriter($fileStream)

    try {
        $writer.Write([UInt16]0)
        $writer.Write([UInt16]1)
        $writer.Write([UInt16]$sizes.Count)

        $imageOffset = 6 + (16 * $sizes.Count)
        for ($i = 0; $i -lt $sizes.Count; $i++) {
            $size = $sizes[$i]
            $image = [byte[]]$iconImages[$i]
            $dimension = if ($size -eq 256) { [byte]0 } else { [byte]$size }

            $writer.Write($dimension)
            $writer.Write($dimension)
            $writer.Write([byte]0)
            $writer.Write([byte]0)
            $writer.Write([UInt16]1)
            $writer.Write([UInt16]32)
            $writer.Write([UInt32]$image.Length)
            $writer.Write([UInt32]$imageOffset)
            $imageOffset += $image.Length
        }

        foreach ($image in $iconImages) {
            $writer.Write([byte[]]$image)
        }
    } finally {
        $writer.Dispose()
    }
} finally {
    $source.Dispose()
}

Write-Host "  OK! Ícone TurboDown gerado em 6 resoluções: $icoPath" -ForegroundColor Green
Write-Host ""
