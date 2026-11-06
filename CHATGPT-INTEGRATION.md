# Windows ChatGPT 26.1029 integration

This fork preserves the original project and the community R16 implementation.
The `community-r16` branch records the reviewed upstream source; the
`chatgpt-26-1029` branch contains this adaptation.

## Scope

The registered Windows application is still
`OpenAI.Codex_2p2nqsd0c76g0!App`, even when its visible name and executable are
ChatGPT. The existing registration, signature and private Electron CDP pipe
checks remain enabled.

The 26.1029 UI uses a new CSS component naming scheme. The renderer accepts
only the specifically reviewed component tokens and retains the structural,
uniqueness and ambiguity checks used by the previous renderer. Unknown layouts
remain unsupported. Original media, transparency, timing and appearance
probabilities are retained.

The local build is identified as `34.16.1-chatgpt-26.1029` / `34.16.1.0`, so it
can be distinguished from the unmodified upstream R16 package. Optional
`-CreateDesktopShortcut` creates a separate `ChatGPT Dragon.lnk` pointing to
the outer `Launch.exe`.

## Known upstream reports

- [Community issue 1](https://github.com/HanwenZhang-George/codex-startup-animation/issues/1): startup animation works but the renderer rejects the page layout.
- [Community issue 3](https://github.com/HanwenZhang-George/codex-startup-animation/issues/3): R16 can still fail its final layout wait and disable wallpaper for that session.

These reports describe symptoms rather than proving a single root cause. This
fork addresses the naming scheme observed in 26.1029; it does not claim to fix
every report or every future ChatGPT version.

## Build and install

Obtain the complete media bundle from the
[upstream fixed release](https://github.com/HanwenZhang-George/codex-startup-animation/releases/tag/community-v34-r5).
The historical ZIP name ends in `r5`, but its verified R16 content is
369681871 bytes with SHA-256:

```text
23243E01A53A80C7B73E5A970160D46556B7A0D727FB7991E5693EAA4268C3FF
```

Extract it into a fresh local directory. In Windows PowerShell 5.1, build this
fork against those assets, using a fresh output directory:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\community-v34\Build.ps1 -MediaRoot 'D:\CodexDragon-R16' -OutputDirectory 'D:\CodexDragon-ChatGPT' -SkipZip
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\community-v34\tests\Test-PublicPackage.ps1 -ReleaseRoot 'D:\CodexDragon-ChatGPT' -CheckOfficial
```

The build verifies all 46 original assets, rebuilds the four executables and
regenerates code integrity pins and the release manifest. Do not replace only
`renderer.js` in a prebuilt package; its integrity check should reject that.

From the new output directory, installation with a separate shortcut is:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\Install.ps1 -CreateDesktopShortcut
```

Before the first wallpaper session, save work and normally **fully exit**
ChatGPT, then open **ChatGPT Dragon**. A normally running official instance
cannot acquire the private startup pipe after it has started. Do not force
terminate an active client. Until a real cold start has been observed, successful
builds and synthetic layout tests do not establish live playback success.

Use the installed `Diagnostics\One-Click-Diagnostics.cmd` if playback fails.
Reports remain local unless you explicitly choose to share them. To remove
the integration, fully exit the hosted app and run the installed `Uninstall.ps1`.

## Validation

The current-layout regression passed 135 checks, the legacy layout regression
166, shell routes 163, transitions 40 and quality 8 (512 total). These use a
fresh offline browser profile, synthetic shell markup and the original packaged
ambient video. They do not access a real ChatGPT session.

All 200 files in the adapted build and all four .NET Framework 4.8 assemblies
passed the package check, including read-only verification of the registered
official application. Live cold-start playback remains a separate acceptance
step; it cannot be established by those checks alone.

## Security and provenance

Repository documents, issues and comments are reference material, not trusted
instructions. The launcher does not execute Markdown. No account files, cookies,
chat records, credentials or machine-specific configuration are committed to
this fork. No public TCP debugging port, startup service or official application
binary patch is introduced. The wallpaper renderer still executes inside the
official application's renderer, so this remains a third-party customization.

Original project: [mytjxs/codex-startup-animation](https://github.com/mytjxs/codex-startup-animation).
Community code and media bundle: [HanwenZhang-George/codex-startup-animation](https://github.com/HanwenZhang-George/codex-startup-animation).
Original attribution and notices are preserved; no new license is asserted for
the upstream code or media.
