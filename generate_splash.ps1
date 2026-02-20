Add-Type -AssemblyName System.Drawing

$width = 1242
$height = 2436
$maxLogoSize = 800
$bgColor = [System.Drawing.Color]::White

$projectPath = "c:\Users\jwfca\Desktop\BluomAppNew"
$logoPath = Join-Path $projectPath "assets\images\logo.png"
$outputPath = Join-Path $projectPath "assets\images\splash.png"

Write-Host "Generating splash screen..."
Write-Host "Source: $logoPath"
Write-Host "Target: $outputPath"

$bmp = New-Object System.Drawing.Bitmap $width, $height
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.Clear($bgColor)

if (Test-Path $logoPath) {
    try {
        $logo = [System.Drawing.Image]::FromFile($logoPath)
        
        # Calculate aspect ratio to fit in 400x400
        $ratioX = $maxLogoSize / $logo.Width
        $ratioY = $maxLogoSize / $logo.Height
        $ratio = [Math]::Min($ratioX, $ratioY)
        
        $newWidth = [int]($logo.Width * $ratio)
        $newHeight = [int]($logo.Height * $ratio)
        
        $x = [int](($width - $newWidth) / 2)
        $y = [int](($height - $newHeight) / 2)
        
        $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $g.DrawImage($logo, $x, $y, $newWidth, $newHeight)
        
        Write-Host "Logo drawn at $x, $y with size $newWidth x $newHeight"
        $logo.Dispose()
    } catch {
        Write-Error "Failed to process logo: $_"
    }
} else {
    Write-Error "Logo file not found at $logoPath"
}

try {
    $bmp.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
    Write-Host "Success: Splash screen saved to $outputPath"
} catch {
    Write-Error "Failed to save splash screen: $_"
} finally {
    $g.Dispose()
    $bmp.Dispose()
}
