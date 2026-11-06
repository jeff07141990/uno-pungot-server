Add-Type -AssemblyName System.Drawing

$srcPath = "c:\Users\User\Desktop\UNO\public\home screen in game icons\Untitled-1.png"
$src = New-Object System.Drawing.Bitmap($srcPath)
$w = $src.Width
$h = $src.Height

# Check background pixel color at corner
$bgPixel = $src.GetPixel(10, 10)
Write-Host "Top-left pixel: A=$($bgPixel.A) R=$($bgPixel.R) G=$($bgPixel.G) B=$($bgPixel.B)"

# Let's inspect Block 1 (Y: 84 to 322) - Find X bounds
# Block 2 (Y: 350 to 570) - Find X bounds for Create and Join
# Block 3 (Y: 596 to 832) - Find X bounds for Play with Bot

function Get-XBounds($startY, $endY) {
    $minX = $w
    $maxX = 0
    for ($y = $startY; $y -le $endY; $y += 2) {
        for ($x = 0; $x -lt $w; $x += 2) {
            $p = $src.GetPixel($x, $y)
            # consider pixel part of button if alpha > 20 and not white/transparent
            if ($p.A -gt 30 -and ($p.R -lt 240 -or $p.G -lt 240 -or $p.B -lt 240)) {
                if ($x -lt $minX) { $minX = $x }
                if ($x -gt $maxX) { $maxX = $x }
            }
        }
    }
    return @($minX, $maxX)
}

$b1X = Get-XBounds 84 322
Write-Host "Play Online: X = $($b1X[0]) to $($b1X[1])"

$b3X = Get-XBounds 596 832
Write-Host "Play With Bot: X = $($b3X[0]) to $($b3X[1])"

# In Row 2, there are 2 buttons: Create & Join. Let's find columns with empty space between them
$row2Cols = New-Object int[] $w
for ($x = 0; $x -lt $w; $x += 2) {
    $cnt = 0
    for ($y = 350; $y -le 570; $y += 2) {
        $p = $src.GetPixel($x, $y)
        if ($p.A -gt 30 -and ($p.R -lt 240 -or $p.G -lt 240 -or $p.B -lt 240)) {
            $cnt++
        }
    }
    $row2Cols[$x] = $cnt
}

# Scan from left to right for 2 distinct islands
$inIsland = $false
$islandStart = 0
$islands = @()
for ($x = 0; $x -lt $w; $x += 2) {
    if ($row2Cols[$x] -gt 5 -and -not $inIsland) {
        $inIsland = $true
        $islandStart = $x
    } elseif ($row2Cols[$x] -le 5 -and $inIsland) {
        $inIsland = $false
        $islands += ,@($islandStart, $x)
    }
}
if ($inIsland) {
    $islands += ,@($islandStart, $w)
}

Write-Host "Row 2 islands count: $($islands.Count)"
foreach ($isl in $islands) {
    Write-Host "Island: X = $($isl[0]) to $($isl[1]) (width = $($isl[1] - $isl[0]))"
}

$src.Dispose()
