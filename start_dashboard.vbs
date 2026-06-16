' start_dashboard.vbs
' Launch the iU Knowledge WS dashboard windowless on fixed port 8530 (production server).
' Double-click to start it right now, or let the Startup folder run it at sign-in.
' Keep this file in the project root (next to package.json and the .next folder).
' ASCII-only on purpose so it is read identically under any console code page;
' the Japanese project path is resolved at runtime, never written in this file.
Option Explicit
Dim fso, sh, projDir, node, nextBin, cmd
Set fso = CreateObject("Scripting.FileSystemObject")
Set sh  = CreateObject("WScript.Shell")
projDir = fso.GetParentFolderName(WScript.ScriptFullName)
node    = "C:\Program Files\nodejs\node.exe"
nextBin = projDir & "\node_modules\next\dist\bin\next"
' Run from the project root so .env.local and the .next build are picked up.
sh.CurrentDirectory = projDir
' Production server, fixed port, localhost only (no firewall prompt, this PC only).
cmd = """" & node & """ """ & nextBin & """ start -p 8530 -H 127.0.0.1"
' 0 = hidden window, False = do not wait for the process to exit
sh.Run cmd, 0, False
