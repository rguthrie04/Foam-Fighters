# Image Optimization Script for Foam Fighters
# This script will help you optimize the spray foam hero image

Write-Host "🖼️  Foam Fighters Image Optimization Tool" -ForegroundColor Cyan
Write-Host "=======================================" -ForegroundColor Cyan
Write-Host ""

$originalImage = "frontend\assets\images\spray foam messy.jpg"
$outputDir = "frontend\assets\images\"

# Check if original image exists
if (Test-Path $originalImage) {
    $originalSize = (Get-Item $originalImage).Length
    Write-Host "✅ Found original image: $originalImage" -ForegroundColor Green
    Write-Host "📊 Current size: $([math]::Round($originalSize/1KB, 2)) KB" -ForegroundColor Yellow
    Write-Host ""
} else {
    Write-Host "❌ Original image not found!" -ForegroundColor Red
    exit 1
}

Write-Host "🎯 OPTIMIZATION RECOMMENDATIONS:" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "For best web performance, your image should be:" -ForegroundColor White
Write-Host "• ✅ Under 100KB file size" -ForegroundColor Green
Write-Host "• ✅ WebP format (90% smaller than JPEG)" -ForegroundColor Green
Write-Host "• ✅ 800px width maximum" -ForegroundColor Green
Write-Host "• ✅ Compressed for web (80% quality)" -ForegroundColor Green
Write-Host ""

Write-Host "🛠️  OPTION 1: Online Tool (Recommended)" -ForegroundColor Cyan
Write-Host "=======================================" -ForegroundColor Cyan
Write-Host "1. Go to: https://squoosh.app" -ForegroundColor Yellow
Write-Host "2. Upload: $originalImage" -ForegroundColor Yellow
Write-Host "3. Settings:" -ForegroundColor Yellow
Write-Host "   - Format: WebP" -ForegroundColor White
Write-Host "   - Quality: 80%" -ForegroundColor White
Write-Host "   - Resize: 800px width" -ForegroundColor White
Write-Host "4. Download and save as: spray-foam-hero-optimized.webp" -ForegroundColor Yellow
Write-Host ""

Write-Host "🛠️  OPTION 2: ImageMagick (If installed)" -ForegroundColor Cyan
Write-Host "=======================================" -ForegroundColor Cyan
Write-Host "Run this command in PowerShell:" -ForegroundColor Yellow
Write-Host 'magick "frontend\assets\images\spray foam messy.jpg" -resize 800x600^ -quality 80 "frontend\assets\images\spray-foam-hero-optimized.webp"' -ForegroundColor White
Write-Host ""

Write-Host "🛠️  OPTION 3: Windows Photos App" -ForegroundColor Cyan
Write-Host "===============================" -ForegroundColor Cyan
Write-Host "1. Open the image in Windows Photos" -ForegroundColor Yellow
Write-Host "2. Click 'Edit & Create' > 'Resize'" -ForegroundColor Yellow
Write-Host "3. Choose 'Custom' and set width to 800px" -ForegroundColor Yellow
Write-Host "4. Save as new file" -ForegroundColor Yellow
Write-Host "5. Use online converter to change to WebP" -ForegroundColor Yellow
Write-Host ""

Write-Host "📈 EXPECTED RESULTS:" -ForegroundColor Cyan
Write-Host "===================" -ForegroundColor Cyan
Write-Host "• Current size: $([math]::Round($originalSize/1KB, 2)) KB" -ForegroundColor Red
Write-Host "• Optimized size: ~30-50 KB (80% reduction!)" -ForegroundColor Green
Write-Host "• Load time: 10x faster" -ForegroundColor Green
Write-Host "• Better user experience" -ForegroundColor Green
Write-Host "• Improved SEO scores" -ForegroundColor Green
Write-Host ""

Write-Host "🚀 AFTER OPTIMIZATION:" -ForegroundColor Cyan
Write-Host "======================" -ForegroundColor Cyan
Write-Host "1. Place optimized file in: $outputDir" -ForegroundColor Yellow
Write-Host "2. Run: firebase deploy --only hosting" -ForegroundColor Yellow
Write-Host "3. Test your site speed!" -ForegroundColor Yellow
Write-Host ""

# Offer to open Squoosh
$openSquoosh = Read-Host "Would you like me to open Squoosh.app in your browser? (y/n)"
if ($openSquoosh -eq 'y' -or $openSquoosh -eq 'Y') {
    Start-Process "https://squoosh.app"
    Write-Host "✅ Opened Squoosh.app in your browser!" -ForegroundColor Green
}

Write-Host ""
Write-Host "💡 TIP: Keep both files (original and optimized) as backup!" -ForegroundColor Yellow
