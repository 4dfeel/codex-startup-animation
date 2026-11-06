[CmdletBinding()]
param([Parameter(Mandatory=$true)][string]$ReleaseRoot,[switch]$CheckOfficial)
. (Join-Path $PSScriptRoot '..\packaging\PackageTools.ps1')
Assert-SupportedPlatform
$root=Assert-RegularPath $ReleaseRoot
$manifest=Read-PackageManifest $root
Test-PackageFiles $root $manifest
foreach($name in @('Launch.exe','Start-Codex-Dragon.exe','WallpaperControls.exe','WallpaperHost.exe')) {
    $binary=[IO.File]::ReadAllBytes((Join-Path $root $name))
    if($binary.Length -lt 96){throw ('Invalid PE header: '+$name)}
    $pe=[BitConverter]::ToInt32($binary,60)
    if($pe -lt 64 -or $pe -gt $binary.Length-94 -or [BitConverter]::ToUInt32($binary,$pe) -ne 0x4550){throw ('Invalid PE offset: '+$name)}
    $expectedSubsystem=if($name -ceq 'WallpaperHost.exe'){3}else{2}
    if([BitConverter]::ToUInt16($binary,$pe+92) -ne $expectedSubsystem){throw ('Invalid GUI/hidden-console subsystem: '+$name)}
    $assembly=[Reflection.Assembly]::ReflectionOnlyLoad($binary)
    $framework=@($assembly.GetCustomAttributesData()|Where-Object {$_.AttributeType.FullName -ceq 'System.Runtime.Versioning.TargetFrameworkAttribute'})
    if($framework.Count -ne 1 -or $framework[0].ConstructorArguments[0].Value -cne '.NETFramework,Version=v4.8'){throw ('Invalid framework: '+$name)}
}
if($CheckOfficial) {
    $start=[Diagnostics.ProcessStartInfo]::new();$start.FileName=Join-Path $root 'Launch.exe';$start.Arguments='--check';$start.UseShellExecute=$false;$start.CreateNoWindow=$true;$start.WindowStyle=[Diagnostics.ProcessWindowStyle]::Hidden
    $process=[Diagnostics.Process]::Start($start)
    try {if(-not $process.WaitForExit(25000)){try{$process.Kill()}catch{};throw 'Official read-only verification timed out.'};if($process.ExitCode -ne 0){throw 'Official Codex prerequisites not verified. No Codex was started.'}}
    finally {$process.Dispose()}
}
Write-Output ('PASS: '+@($manifest.files).Count+' files and four .NET Framework 4.8 assemblies verified. No Codex client was started or stopped.')
