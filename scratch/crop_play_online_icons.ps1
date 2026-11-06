Add-Type -AssemblyName System.Drawing

$srcPath = "c:\Users\User\Desktop\UNO\public\play online modal and buttons\play online.png"
$destDir = "c:\Users\User\Desktop\UNO\public\play online modal and buttons"
$src = New-Object System.Drawing.Bitmap($srcPath)
$w = $src.Width
$h = $src.Height
Write-Host "Play online image: $w x $h"

# 1. Gold Button Blank Template (or from 100/200 button):
# The button for "100" is around X: 730..866, Y: 260..348
# Let's crop one gold button
function Crop-Image($name, $x1, $y1, $x2, $y2) {
    $cw = $x2 - $x1
    $ch = $y2 - $y1
    $out = New-Object System.Drawing.Bitmap($cw, $ch)
    $g = [System.Drawing.Graphics]::FromImage($out)
    $rect = New-Object System.Drawing.Rectangle(0, 0, $cw, $ch)
    $srcRect = New-Object System.Drawing.Rectangle($x1, $y1, $cw, $ch)
    $g.DrawImage($src, $rect, $srcRect, [System.Drawing.GraphicsUnit]::Pixel)
    $g.Dispose()
    $savePath = Join-Path $destDir $name
    $out.Save($savePath, [System.Drawing.Imaging.ImageFormat]::Png)
    $out.Dispose()
    Write-Host "Saved: $name ($cw x $ch)"
}

# Coins icon: approx X: 718..836, Y: 145..268
Crop-Image "icon_coins.png" 715 145 836 268

# Timer icon: approx X: 720..830, Y: 390..510
Crop-Image "icon_timer.png" 720 390 830 510

# Cards icon: approx X: 710..840, Y: 600..730
Crop-Image "icon_cards.png" 710 600 840 730

$src.Dispose()
