# gerar-icone.ps1
# Gera assets/icon.ico 100% nativo e oficial para Windows (.NET GetHicon)

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$icoPath   = Join-Path $scriptDir "assets\icon.ico"

Add-Type -AssemblyName System.Drawing

Write-Host ""
Write-Host "  Criando assets\icon.ico nativo..." -ForegroundColor Cyan

# Bitmap 256x256
$bmp = New-Object System.Drawing.Bitmap(256, 256)
$g   = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic

# Fundo arredondado moderno (#0f0f1a)
$bgBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 15, 15, 26))
$path2d  = New-Object System.Drawing.Drawing2D.GraphicsPath
$r = 45
$path2d.AddArc(6, 6, $r*2, $r*2, 180, 90)
$path2d.AddArc(250-$r*2, 6, $r*2, $r*2, 270, 90)
$path2d.AddArc(250-$r*2, 250-$r*2, $r*2, $r*2, 0, 90)
$path2d.AddArc(6, 250-$r*2, $r*2, $r*2, 90, 90)
$path2d.CloseFigure()
$g.FillPath($bgBrush, $path2d)

# Borda sutil
$borderPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(60, 255, 255, 255), 2)
$g.DrawPath($borderPen, $path2d)

# Ícone de Play vermelho YouTube (#ff4444)
$redBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 255, 68, 68))
$playPts  = [System.Drawing.PointF[]]@(
    [System.Drawing.PointF]::new(92,  68),
    [System.Drawing.PointF]::new(188, 128),
    [System.Drawing.PointF]::new(92,  188)
)
$g.FillPolygon($redBrush, $playPts)
$g.Dispose()

# Obter o handle nativo de ícone do Windows e salvar
$hicon = $bmp.GetHicon()
$icon = [System.Drawing.Icon]::FromHandle($hicon)
$fs = New-Object System.IO.FileStream($icoPath, [System.IO.FileMode]::Create)
$icon.Save($fs)
$fs.Close()
$icon.Dispose()
$bmp.Dispose()

Write-Host "  OK! Icone oficial gerado com sucesso: $icoPath" -ForegroundColor Green
Write-Host ""
