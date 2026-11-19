' Cria as pastas das O.S. novas (app\scripts\pastas-automaticas.ts) sem abrir janela.
' Chamado pela tarefa agendada "Fluxo Caixa - Pastas das OS" (a cada 5 minutos), ligada por "Ligar pastas automaticas.cmd".
Set fso = CreateObject("Scripting.FileSystemObject")
app = fso.GetParentFolderName(fso.GetParentFolderName(WScript.ScriptFullName)) & "\app"
CreateObject("WScript.Shell").Run "cmd /c cd /d """ & app & """ && npx vite-node scripts/pastas-automaticas.ts", 0, False
