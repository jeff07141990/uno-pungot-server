Add-Type -AssemblyName System.Drawing

$srcPath = "c:\Users\User\Desktop\UNO\public\home screen in game icons\Untitled-1.png"
$destDir = "c:\Users\User\Desktop\UNO\public\home screen in game icons"

$src = New-Object System.Drawing.Bitmap($srcPath)
$w = $src.Width
$h = $src.Height

# Definitions:
# 1. Play Online: X: 90..1382, Y: 82..324
# 2. Create: X: 102..742, Y: 348..572
# 3. Join: X: 744..1384, Y: 348..572
# 4. Play with Bot: X: 90..1382, Y: 594..834

$buttons = @(
    @{ Name = "btn_play_online.png"; X1 = 88; Y1 = 80; X2 = 1384; Y2 = 326 },
    @{ Name = "btn_create.png";      X1 = 100; Y1 = 346; X2 = 744; Y2 = 574 },
    @{ Name = "btn_join.png";        X1 = 742; Y1 = 346; X2 = 1386; Y2 = 574 },
    @{ Name = "btn_play_bot.png";     X1 = 88; Y1 = 592; X2 = 1384; Y2 = 836 }
)

foreach ($btn in $buttons) {
    $cropW = $btn.X2 - $btn.X1
    $cropH = $btn.Y2 - $btn.Y1
    
    $outBmp = New-Object System.Drawing.Bitmap($cropW, $cropH, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    
    for ($y = 0; $y -lt $cropH; $y++) {
        $srcY = $btn.Y1 + $y
        if ($srcY -ge $h) { continue }
        for ($x = 0; $x -lt $cropW; $x++) {
            $srcX = $btn.X1 + $x
            if ($srcX -ge $w) { continue }
            
            $p = $src.GetPixel($srcX, $srcY)
            
            # Remove white background cleanly (chroma-key white to transparent)
            # Check how close to pure white (255, 255, 255)
            $diff = (255 - $p.R) + (255 - $p.G) + (255 - $p.B)
            
            if ($diff -lt 15) {
                # fully transparent
                $outBmp.SetPixel($x, $y, [System.Drawing.Color]::FromArgb(0, 0, 0, 0))
            } elseif ($diff -lt 55) {
                # anti-aliased edge
                $alpha = [int]($diff * 255 / 55)
                if ($alpha -gt 255) { $alpha = 255 }
                $outBmp.SetPixel($x, $y, [System.Drawing.Color]::FromArgb($alpha, $p.R, $p.G, $p.B))
            } else {
                $outBmp.SetPixel($x, $y, $p)
            }
        }
    }
    
    $savePath = Join-Path $destDir $btn.Name
    $outBmp.Save($savePath, [System.Drawing.Imaging.ImageFormat]::Png)
    $outBmp.Dispose()
    Write-Host "Saved: $savePath ($cropW x $cropH)"
}

$src.Dispose()
Write-Host "Completed extracting 4 buttons."
