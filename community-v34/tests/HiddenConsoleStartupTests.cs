using System;
using System.Diagnostics;
using System.IO;
using System.Reflection;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading;
namespace DragonLauncher {
internal static class HiddenConsoleStartupTests {
 [DllImport("kernel32.dll")]static extern IntPtr GetConsoleWindow();
 [DllImport("kernel32.dll",SetLastError=true)]static extern bool AttachConsole(uint pid);
 [DllImport("user32.dll")]static extern bool IsWindowVisible(IntPtr h);
 [DllImport("user32.dll",CharSet=CharSet.Unicode)]static extern IntPtr CreateDesktop(string name,IntPtr device,IntPtr mode,uint flags,uint access,IntPtr attrs);
 [DllImport("user32.dll")]static extern bool CloseDesktop(IntPtr desktop);
 [StructLayout(LayoutKind.Sequential,CharSet=CharSet.Unicode)]struct SI{public int Size;public string Reserved,Desktop,Title;public uint X,Y,XSize,YSize,XCount,YCount,Fill,Flags;public short Show,ReservedSize;public IntPtr ReservedBytes,Input,Output,Error;}
 [StructLayout(LayoutKind.Sequential)]struct PI{public IntPtr Process,Thread;public uint Pid,Tid;}
 [DllImport("kernel32.dll",CharSet=CharSet.Unicode,SetLastError=true)]static extern bool CreateProcess(string app,StringBuilder command,IntPtr pa,IntPtr ta,bool inherit,uint flags,IntPtr env,string cwd,ref SI si,out PI pi);
 [DllImport("kernel32.dll")]static extern bool CloseHandle(IntPtr h);
 [DllImport("kernel32.dll")]static extern bool GetExitCodeProcess(IntPtr process,out uint code);
 static string Q(string value){return "\""+value+"\"";}
 static void Require(bool ok,string message){if(!ok)throw new Exception(message);}
 static IntPtr Hidden(string root,bool compare){var h=GetConsoleWindow();Require(h!=IntPtr.Zero,"console must exist");if(compare)Require(h.ToInt64()==BitConverter.ToInt64(File.ReadAllBytes(Path.Combine(root,"console.bin")),0),"descendant must share the original hidden console");for(int i=0;i<12;i++){Require(!IsWindowVisible(h),"console must never become visible");Thread.Sleep(15);}return h;}
 static void WaitChild(Process child){using(child){Require(child!=null&&child.WaitForExit(7000),"owned console fixture timed out");Require(child.ExitCode==0,"owned console fixture rejected hidden inheritance");}}
 static int Host(string root){var h=Hidden(root,false);File.WriteAllBytes(Path.Combine(root,"console.bin"),BitConverter.GetBytes(h.ToInt64()));string gui=Path.Combine(AppDomain.CurrentDomain.BaseDirectory,"HiddenConsoleGuiFixture.exe");WaitChild(Process.Start(new ProcessStartInfo(gui,"--electron-like "+Q(root)){UseShellExecute=false,CreateNoWindow=false,WindowStyle=ProcessWindowStyle.Hidden}));Hidden(root,false);File.WriteAllText(Path.Combine(root,"host.ok"),"hidden");return 0;}
 static int Gui(string root){Require(GetConsoleWindow()==IntPtr.Zero,"GUI child begins detached like Electron");Require(AttachConsole(UInt32.MaxValue),"Electron-like GUI must attach to parent console");Hidden(root,true);string worker=Path.Combine(AppDomain.CurrentDomain.BaseDirectory,"HiddenConsoleStartupTests.exe");WaitChild(Process.Start(new ProcessStartInfo(worker,"--worker "+Q(root)){UseShellExecute=false,CreateNoWindow=false,WindowStyle=ProcessWindowStyle.Normal}));Hidden(root,true);File.WriteAllText(Path.Combine(root,"gui.ok"),"hidden");return 0;}
 static int Supervise(string root){Require(GetConsoleWindow()==IntPtr.Zero,"actual GUI launcher must not own a console");string host=Path.Combine(AppDomain.CurrentDomain.BaseDirectory,"HiddenConsoleStartupTests.exe");var info=BridgeActivation.HiddenHostStartInfo(host,"--host "+Q(root),root);Require(!info.UseShellExecute&&!info.CreateNoWindow&&info.WindowStyle==ProcessWindowStyle.Hidden,"production host creation policy");WaitChild(Process.Start(info));foreach(string name in new[]{"host.ok","gui.ok","worker.ok"})Require(File.Exists(Path.Combine(root,name)),"owned chain receipt missing");File.WriteAllText(Path.Combine(root,"supervisor.ok"),"hidden");return 0;}
 static int Parent(string root){string name="HiddenConsoleFixture"+Guid.NewGuid().ToString("N");IntPtr desktop=CreateDesktop(name,IntPtr.Zero,IntPtr.Zero,0,0x1ff,IntPtr.Zero);Require(desktop!=IntPtr.Zero,"private non-input desktop creation");try{string gui=Path.Combine(AppDomain.CurrentDomain.BaseDirectory,"HiddenConsoleGuiFixture.exe");var si=new SI{Size=Marshal.SizeOf(typeof(SI)),Desktop=name,Flags=1,Show=0};PI pi;Require(CreateProcess(gui,new StringBuilder(Q(gui)+" --supervise "+Q(root)),IntPtr.Zero,IntPtr.Zero,false,0x08000000,IntPtr.Zero,root,ref si,out pi),"owned GUI creation");try{using(var child=Process.GetProcessById((int)pi.Pid)){Require(child.WaitForExit(7000),"private GUI fixture timed out");}uint exitCode;Require(GetExitCodeProcess(pi.Process,out exitCode)&&exitCode==0,"private GUI fixture failed");}finally{CloseHandle(pi.Thread);CloseHandle(pi.Process);}Require(File.Exists(Path.Combine(root,"supervisor.ok")),"full hidden console chain completed");Console.WriteLine("{\"passed\":true,\"privateNonInputDesktop\":true,\"actualChatGPTStarted\":false,\"hostConsoleHidden\":true,\"guiAttachedHidden\":true,\"defaultConsoleChildHidden\":true}");return 0;}finally{CloseDesktop(desktop);}}
 [STAThread]static int Main(string[] args){string root=args.Length>1?args[1]:args[0];try{if(args[0]=="--host")return Host(root);if(args[0]=="--electron-like")return Gui(root);if(args[0]=="--supervise")return Supervise(root);if(args[0]=="--worker"){Hidden(root,true);File.WriteAllText(Path.Combine(root,"worker.ok"),"hidden");return 0;}return Parent(root);}catch(Exception error){File.WriteAllText(Path.Combine(root,"error-"+Process.GetCurrentProcess().Id+".txt"),error.Message);Console.WriteLine("FAIL: "+error.Message);return 1;}}
}
}