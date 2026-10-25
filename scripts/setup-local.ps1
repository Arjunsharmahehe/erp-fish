$ErrorActionPreference = 'Stop'
$projectRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$targetFile = Join-Path $projectRoot '.env.docker'
if (Test-Path -LiteralPath $targetFile) {
    Write-Host '.env.docker already exists; its keys were preserved.'
    exit 0
}
function New-EncodedSecret([int] $Length) {
    $bytes = New-Object byte[] $Length
    $generator = [Security.Cryptography.RandomNumberGenerator]::Create()
    try { $generator.GetBytes($bytes) } finally { $generator.Dispose() }
    return [Convert]::ToBase64String($bytes)
}
$templateFile = Join-Path $projectRoot '.env.docker.example'
$template = [IO.File]::ReadAllText($templateFile)
$template = $template.Replace('JWT_SECRET=GENERATE_ONCE', ('JWT_SECRET=' + (New-EncodedSecret 48)))
$template = $template.Replace('ERP_CREDENTIALS_KEY=GENERATE_ONCE', ('ERP_CREDENTIALS_KEY=' + (New-EncodedSecret 32)))
[IO.File]::WriteAllText($targetFile, $template, (New-Object Text.UTF8Encoding $false))
Write-Host 'Created .env.docker. Keep it with your database backup; do not share or commit it.'
Write-Host 'Add optional provider keys there, then run: docker compose --env-file .env.docker up --build -d'
