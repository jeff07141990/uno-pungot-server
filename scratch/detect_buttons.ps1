Add-Type -AssemblyName System.Drawing

$srcPath = "c:\Users\User\Desktop\UNO\public\home screen in game icons\Untitled-1.png"
$destDir = "c:\Users\User\Desktop\UNO\public\home screen in game icons"

$srcBitmap = New-Object System.Drawing.Bitmap($srcPath)
$w = $srcBitmap.Width
$h = $srcBitmap.Height
Write-Host "Source image: $w x $h"

# Find non-transparent / non-white bounding boxes or analyze rows
# Let's inspect rows with color
function IsColoredPixel($color) {
    if ($color.A -lt 30) { return $false }
    # Check if not pure white
    if ($color.R -gt 245 -and $color.G -gt 245 -and $color.B -gt 245) { return $false }
    return $true
}

# Scan horizontal projections
$rowCounts = New-Object int[] $h
for ($y = 0; $y -lt $h; $y += 2) {
    $cnt = 0
    for ($x = 0; $x -lt $w; $x += 4) {
        $c = $srcBitmap.GetPixel($x, $y)
        if (IsColoredPixel($c)) {
            $cnt++
        }
    }
    $rowCounts[$y] = $cnt
}

$inBlock = $false
$startRow = 0
$blocks = @()

for ($y = 0; $y -lt $h; $y += 2) {
    if ($rowCounts[$y] -gt 5 -and -not $inBlock) {
        $inBlock = $true
        $startRow = $y
    } elseif ($rowCounts[$y] -le 5 -and $inBlock) {
        $inBlock = $false
        $blocks += ,@($startRow, $y)
    }
}
if ($inBlock) {
    $blocks += ,@($startRow, $h)
}

Write-Host "Found vertical blocks: $($blocks.Count)"
foreach ($b in $blocks) {
    Write-Host "Block: Y = $($b[0]) to $($b[1]) (height = $($b[1] - $b[0]))"
}

$srcBitmap.Dispose()
