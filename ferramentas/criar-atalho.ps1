# Cria o atalho "Fluxo Caixa" na area de trabalho e no menu Iniciar deste PC (copiado do FLUXO ARQ).
# Abre dist/Fluxo_Caixa.html como aplicativo do Chrome (janela propria, sem abas), ou do Edge se nao houver Chrome.
# O caminho vem da pasta deste script, entao funciona em qualquer PC (o usuario do Windows muda de um PC para outro).
# Tambem grava no atalho a mesma identidade (AppUserModelID) que o Chrome da a janela do sistema: assim, fixado na
# barra de tarefas, o atalho fica com a logo do Fluxo (sem isso o Windows junta a janela com o Chrome e mostra o icone dele).
$ErrorActionPreference = 'Stop'
$raiz = Split-Path -Parent $PSScriptRoot
$html = Join-Path $raiz 'dist\Fluxo_Caixa.html'
if (-not (Test-Path $html)) { Write-Host "Nao achei $html. Abra o Abrir Fluxo Caixa.cmd uma vez (ele gera o sistema) e rode este arquivo de novo."; exit 1 }
$url = ([Uri]$html).AbsoluteUri

function Achar($exe, $extras) {
  foreach ($chave in "HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\$exe", "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\$exe") {
    try { $p = (Get-ItemProperty $chave -ErrorAction Stop).'(default)'; if ($p -and (Test-Path $p)) { return $p } } catch {}
  }
  foreach ($p in $extras) { if (Test-Path $p) { return $p } }
  return $null
}
$nav = Achar 'chrome.exe' @("$env:ProgramFiles\Google\Chrome\Application\chrome.exe", "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe", "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe")
if (-not $nav) { $nav = Achar 'msedge.exe' @("${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe", "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe") }
if (-not $nav) { Write-Host 'Nao achei o Chrome nem o Edge neste PC.'; exit 1 }

$nome = 'Fluxo Caixa'
$sh = New-Object -ComObject WScript.Shell
$atalhos = @()
$destinos = @([Environment]::GetFolderPath('Desktop'), (Join-Path ([Environment]::GetFolderPath('Programs')) ''))
foreach ($d in $destinos) {
  $arq = Join-Path $d "$nome.lnk"
  $a = $sh.CreateShortcut($arq)
  $a.TargetPath = $nav
  $a.Arguments = "--app=`"$url`""
  $a.WorkingDirectory = Split-Path -Parent $nav
  $a.IconLocation = (Join-Path $PSScriptRoot 'fluxo.ico') + ',0'
  $a.Description = 'Fluxo Caixa: O.S. da Caixa (laboratorio local)'
  $a.Save()
  $atalhos += $arq
  Write-Host "Atalho criado: $arq"
}

# ---------- Identidade da janela (AppUserModelID) ----------
Add-Type -TypeDefinition @'
using System;
using System.Text;
using System.Runtime.InteropServices;
[StructLayout(LayoutKind.Sequential, Pack=4)] public struct FcPKey { public Guid fmtid; public uint pid; }
[StructLayout(LayoutKind.Sequential)] public struct FcPVar { public ushort vt; public ushort r1; public ushort r2; public ushort r3; public IntPtr p; public IntPtr p2; }
[ComImport, Guid("886D8EEB-8CF2-4446-8D02-CDBA1DBDCF99"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
public interface FcIPropertyStore { [PreserveSig] int GetCount(out uint c); [PreserveSig] int GetAt(uint i, out FcPKey k); [PreserveSig] int GetValue(ref FcPKey k, out FcPVar v); [PreserveSig] int SetValue(ref FcPKey k, ref FcPVar v); [PreserveSig] int Commit(); }
[ComImport, Guid("0000010b-0000-0000-C000-000000000046"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
public interface FcIPersistFile { void GetClassID(out Guid g); [PreserveSig] int IsDirty(); void Load([MarshalAs(UnmanagedType.LPWStr)] string f, uint mode); void Save([MarshalAs(UnmanagedType.LPWStr)] string f, bool lembrar); void SaveCompleted([MarshalAs(UnmanagedType.LPWStr)] string f); void GetCurFile(out IntPtr p); }
[ComImport, Guid("00021401-0000-0000-C000-000000000046")] public class FcShellLink {}
public static class FcAumid {
  public delegate bool EnumProc(IntPtr h, IntPtr l);
  [DllImport("user32.dll")] static extern bool EnumWindows(EnumProc f, IntPtr l);
  [DllImport("user32.dll", CharSet=CharSet.Unicode)] static extern int GetWindowText(IntPtr h, StringBuilder s, int n);
  [DllImport("user32.dll", CharSet=CharSet.Unicode)] static extern int GetClassName(IntPtr h, StringBuilder s, int n);
  [DllImport("shell32.dll")] static extern int SHGetPropertyStoreForWindow(IntPtr h, ref Guid iid, [MarshalAs(UnmanagedType.Interface)] out FcIPropertyStore ps);
  static FcPKey Chave(){ return new FcPKey{fmtid=new Guid("9F4C2855-9F79-4B39-A8D0-E1D42DE1D5F3"),pid=5}; }
  // Identidade da janela do Chrome com o titulo do sistema (vazio se nao estiver aberta).
  public static string DaJanela(string titulo){ string achado=""; EnumWindows((h,l)=>{ var t=new StringBuilder(300); GetWindowText(h,t,300); var c=new StringBuilder(100); GetClassName(h,c,100);
      if(t.ToString()==titulo && c.ToString().StartsWith("Chrome_WidgetWin")){ Guid iid=typeof(FcIPropertyStore).GUID; FcIPropertyStore ps;
        if(SHGetPropertyStoreForWindow(h, ref iid, out ps)==0){ var k=Chave(); FcPVar v; if(ps.GetValue(ref k, out v)==0 && v.vt==31){ achado=Marshal.PtrToStringUni(v.p); return false; } } }
      return true; }, IntPtr.Zero); return achado; }
  // Grava a identidade no atalho (.lnk).
  public static void NoAtalho(string arq, string id){ var link=new FcShellLink(); var pf=(FcIPersistFile)link; pf.Load(arq, 2); var ps=(FcIPropertyStore)link;
    var k=Chave(); var v=new FcPVar(); v.vt=31; v.p=Marshal.StringToCoTaskMemUni(id); int hr=ps.SetValue(ref k, ref v); if(hr!=0) throw new Exception("SetValue "+hr);
    ps.Commit(); pf.Save(arq, true); }
}
'@
$id = [FcAumid]::DaJanela($nome)
if (-not $id) {
  Write-Host 'Abrindo o sistema uma vez para ler a identidade da janela...'
  Start-Process -FilePath $atalhos[0]
  for ($i = 0; $i -lt 20 -and -not $id; $i++) { Start-Sleep -Milliseconds 700; $id = [FcAumid]::DaJanela($nome) }
}
if ($id) {
  foreach ($arq in $atalhos) { [FcAumid]::NoAtalho($arq, $id) }
  Write-Host "Identidade gravada nos atalhos: $id"
  Write-Host 'Para fixar na barra de tarefas: clique com o botao direito no atalho Fluxo Caixa (area de trabalho ou menu Iniciar) e escolha Fixar na barra de tarefas.'
} else {
  Write-Host 'Nao consegui ler a identidade da janela (o sistema nao abriu a tempo). Rode este arquivo de novo com o sistema aberto.'
}
Write-Host "Abre: $url"
Write-Host "Com: $nav"
