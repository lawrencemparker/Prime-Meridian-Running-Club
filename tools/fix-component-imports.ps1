# tools/fix-component-imports.ps1
# Converts relative imports like ../../components/... to @/components/...
# Skips node_modules and .next

$ErrorActionPreference = "Stop"

$root = (Get-Location).Path

$files = Get-ChildItem -Recurse -File -Include *.ts,*.tsx,*.js,*.jsx |
  Where-Object { $_.FullName -notmatch '\\(node_modules|\.next)\\' }

$changed = 0

foreach ($f in $files) {
  $path = $f.FullName

  # -Raw returns a single string; if it fails for any reason, skip safely
  try {
    $c = Get-Content -LiteralPath $path -Raw -ErrorAction Stop
  } catch {
    continue
  }

  if ([string]::IsNullOrWhiteSpace($c)) { continue }

  $orig = $c

  # Replace any import path segment like:
  #   "../components/..." or "../../components/..." or "../../../components/..."
  # with "@/components/..."
  #
  # Handles both single and double quotes inside import strings.
  $c = [regex]::Replace(
    $c,
    '(["''])(?:\.\./)+components/',
    '$1@/components/'
  )

  if ($c -ne $orig) {
    Set-Content -LiteralPath $path -Value $c -NoNewline -Encoding UTF8
    $changed++
  }
}

Write-Host "Updated files: $changed"
