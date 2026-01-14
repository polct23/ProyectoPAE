$dashboards = @('traffic-accidents', 'main-dashboard')
foreach ($dash in $dashboards) {
  Write-Host "=== Dashboard: $dash ===" -ForegroundColor Green
  $json = Get-Content "c:\Users\didic\PAE\ProyectoPAE\grafana\dashboards\$dash.json" | ConvertFrom-Json
  $i = 0
  foreach ($panel in $json.panels) {
    Write-Host "Panel $i - $($panel.title)"
    $i = $i + 1
  }
  Write-Host ""
}
