using System;
using System.IO;
using System.Drawing;
using System.Windows.Forms;
using System.Collections.Generic;
using System.Diagnostics;
using System.Threading.Tasks;
using System.Web.Script.Serialization;
using System.Reflection;
using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.WinForms;

[assembly: AssemblyTitle("临床拾问 · 神内问诊助手")]
[assembly: AssemblyVersion("0.9.0.0")]
[assembly: System.Runtime.Versioning.TargetFramework(".NETFramework,Version=v4.6.2")]

internal sealed class DesktopWindow : Form
{
    readonly WebView2 browser = new WebView2();
    readonly ToolStrip bar = new ToolStrip();
    readonly ToolStripStatusLabel status = new ToolStripStatusLabel();
    readonly JavaScriptSerializer json = new JavaScriptSerializer { MaxJsonLength = 10000000 };
    readonly string site = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "www");
    readonly string profile;
    readonly bool force109;
    bool ready;
    CoreWebView2Environment environment;

    public DesktopWindow(string profileOverride, bool force109)
    {
        this.force109 = force109;
        profile = profileOverride ?? Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "NeuroIntakeDesktop", "Profile");
        Text = "临床拾问 · 神内问诊助手";
        if(force109)Text += " · 兼容内核测试";
        Icon=Icon.ExtractAssociatedIcon(Application.ExecutablePath);
        Font = new Font("Microsoft YaHei UI", 9);
        KeyPreview = true;
        AutoScaleMode = AutoScaleMode.Dpi;
        StartPosition = FormStartPosition.CenterScreen;
        MinimumSize = new Size(520, 520);
        StandardWindow();
        BackColor = Color.FromArgb(243, 246, 245);
        bar.GripStyle = ToolStripGripStyle.Hidden;
        bar.RenderMode = ToolStripRenderMode.System;
        bar.BackColor = Color.White;
        bar.Padding = new Padding(10, 7, 10, 7);
        bar.Font = Font;
        bar.Items.Add(new ToolStripLabel("临床拾问") { ForeColor = Color.FromArgb(8,105,93), Font = new Font(Font, FontStyle.Bold) });
        bar.Items.Add(new ToolStripSeparator());
        AddAction("＋ 新建接诊", "newEncounter", "Ctrl+N");
        var more = new ToolStripDropDownButton("工具");
        more.DropDownItems.Add("备份接诊记录…", null, delegate { Run("backupRecords"); });
        more.DropDownItems.Add("恢复接诊记录…", null, delegate { Run("restoreRecords"); });
        more.DropDownItems.Add(new ToolStripSeparator());
        more.DropDownItems.Add("标准窗口", null, delegate { TopMost=false; StandardWindow(); CenterToScreen(); });
        more.DropDownItems.Add("贴边填写", null, delegate {
            WindowState=FormWindowState.Normal;
            Rectangle area=Screen.FromControl(this).WorkingArea;
            Bounds=new Rectangle(area.Right-Math.Min(600,area.Width),area.Top,Math.Min(600,area.Width),area.Height);
        });
        var pin = new ToolStripMenuItem("窗口置顶") { CheckOnClick=true };
        pin.CheckedChanged += delegate { TopMost=pin.Checked; };
        more.DropDownItems.Add(pin);
        more.DropDownItems.Add("复制异常体征", null, delegate { Run("copyAbnormal"); });
        more.DropDownItems.Add("使用说明", null, delegate { Process.Start(new ProcessStartInfo(Path.Combine(AppDomain.CurrentDomain.BaseDirectory,"使用说明.txt")) {UseShellExecute=true}); });
        bar.Items.Add(more);
        // ToolStrip places right-aligned items from the outer edge inward.
        AddCopy("复制整份病历", "copyAll", "Ctrl+Shift+A", true);
        AddCopy("复制查体", "copyExamination", "Ctrl+Shift+E", false);
        AddCopy("复制现病史", "copyHistory", "Ctrl+Shift+C", false);
        var bottom = new StatusStrip { SizingGrip=true, BackColor=Color.White };
        status.Text="正在打开本地接诊记录…";
        bottom.Items.Add(status);
        browser.Dock=DockStyle.Fill;
        browser.KeyDown += delegate(object sender,KeyEventArgs e){
            string action=Shortcut(e.KeyCode | Control.ModifierKeys);
            if(action==null)return;
            e.Handled=true;e.SuppressKeyPress=true;
            // WebView blocks cross-process calls during accelerator callbacks.
            BeginInvoke(new Action(delegate{Run(action);}));
        };
        Controls.Add(browser); Controls.Add(bar); Controls.Add(bottom);
        Shown += async delegate { await Initialize(); };
        FormClosed += delegate { browser.Dispose(); };
    }

    void StandardWindow()
    {
        WindowState=FormWindowState.Normal;
        Rectangle area=Screen.FromControl(this).WorkingArea;
        Size=new Size(Math.Min(1440,area.Width-24),Math.Min(940,area.Height-24));
    }
    void AddAction(string label,string method,string shortcut)
    {
        var button=new ToolStripButton(label) { DisplayStyle=ToolStripItemDisplayStyle.Text, ToolTipText=label+" ("+shortcut+")", Margin=new Padding(4,0,4,0), Padding=new Padding(5,5,5,5) };
        button.Click += delegate {Run(method);}; bar.Items.Add(button);
    }
    void AddCopy(string label,string method,string shortcut,bool primary)
    {
        var button=new ToolStripButton(label) { Alignment=ToolStripItemAlignment.Right,DisplayStyle=ToolStripItemDisplayStyle.Text,ToolTipText=label+" ("+shortcut+")",Margin=new Padding(4,0,4,0),Padding=new Padding(9,5,9,5),ForeColor=primary?Color.White:Color.FromArgb(8,105,93),BackColor=primary?Color.FromArgb(8,105,93):Color.FromArgb(237,246,241) };
        button.Click += delegate {Run(method);}; bar.Items.Add(button);
    }
    protected override bool ProcessCmdKey(ref Message msg, Keys keyData)
    {
        string action=Shortcut(keyData);
        if(action!=null){BeginInvoke(new Action(delegate{Run(action);}));return true;}
        return base.ProcessCmdKey(ref msg,keyData);
    }
    string Shortcut(Keys keys)
    {
        if(keys==(Keys.Control|Keys.N))return "newEncounter";
        if(keys==(Keys.Control|Keys.Shift|Keys.C))return "copyHistory";
        if(keys==(Keys.Control|Keys.Shift|Keys.E))return "copyExamination";
        if(keys==(Keys.Control|Keys.Shift|Keys.A))return "copyAll";
        return null;
    }
    async void Run(string method)
    {
        if(!ready){status.Text="页面尚未就绪，请稍候";return;}
        try { await browser.ExecuteScriptAsync("window.neuroDesktop."+method+"()"); }
        catch(Exception e){status.Text="操作未完成："+e.Message;}
    }
    bool IsLocal(string address)
    {
        Uri uri;
        return Uri.TryCreate(address,UriKind.Absolute,out uri)&&uri.Scheme=="https"&&uri.Host=="neuro.local"&&uri.IsDefaultPort;
    }
    void External(string address)
    {
        Uri uri;
        if(Uri.TryCreate(address,UriKind.Absolute,out uri)&&(uri.Scheme=="https"||uri.Scheme=="http"))
            Process.Start(new ProcessStartInfo(address){UseShellExecute=true});
    }
    async Task Initialize()
    {
        try {
            bool legacy=Environment.OSVersion.Version.Major<10;
            string fixedFolder=Path.Combine(AppDomain.CurrentDomain.BaseDirectory,"runtime109",Environment.Is64BitProcess?"x64":"x86");
            string runtime=null;
            if((legacy||force109)&&File.Exists(Path.Combine(fixedFolder,"msedgewebview2.exe")))runtime=fixedFolder;
            if(force109&&runtime==null)throw new Exception("缺少随包的 Runtime 109。请完整解压程序文件夹。");
            // Modern machines prefer their updated Evergreen runtime. Offline bundle is a fallback.
            if(runtime==null){try{CoreWebView2Environment.GetAvailableBrowserVersionString();}catch(WebView2RuntimeNotFoundException){if(File.Exists(Path.Combine(fixedFolder,"msedgewebview2.exe")))runtime=fixedFolder;}}
            environment=await CoreWebView2Environment.CreateAsync(runtime,profile);
            await browser.EnsureCoreWebView2Async(environment);
            var core=browser.CoreWebView2;
            core.SetVirtualHostNameToFolderMapping("neuro.local",site,CoreWebView2HostResourceAccessKind.DenyCors);
            core.Settings.IsStatusBarEnabled=false;
            core.NavigationStarting += delegate(object sender,CoreWebView2NavigationStartingEventArgs e){if(!IsLocal(e.Uri)){e.Cancel=true;External(e.Uri);}};
            core.NewWindowRequested += async delegate(object sender,CoreWebView2NewWindowRequestedEventArgs e){
                e.Handled=true;
                if(!IsLocal(e.Uri)){External(e.Uri);return;}
                var deferral=e.GetDeferral();
                try {
                    var child=new WebView2{Dock=DockStyle.Fill};
                    var form=new Form{Text="虚构病例 · 模拟医院病历",Width=1000,Height=760,StartPosition=FormStartPosition.CenterParent};
                    form.Controls.Add(child); form.FormClosed+=delegate{child.Dispose();};form.Show(this);
                    await child.EnsureCoreWebView2Async(environment);
                    child.CoreWebView2.SetVirtualHostNameToFolderMapping("neuro.local",site,CoreWebView2HostResourceAccessKind.DenyCors);
                    child.CoreWebView2.NavigationStarting+=delegate(object s,CoreWebView2NavigationStartingEventArgs n){if(!IsLocal(n.Uri)){n.Cancel=true;External(n.Uri);}};
                    e.NewWindow=child.CoreWebView2;
                } catch(Exception ex){MessageBox.Show(this,ex.Message,Text);}finally{deferral.Complete();}
            };
            core.WebMessageReceived+=OnMessage;
            core.NavigationCompleted+=delegate(object sender,CoreWebView2NavigationCompletedEventArgs e){
                ready=e.IsSuccess;
                status.Text=e.IsSuccess?"本机自动保存 · Ctrl+Shift+C 复制现病史 · 内核 "+environment.BrowserVersionString:"页面未能打开："+e.WebErrorStatus;
            };
            browser.Source=new Uri("https://neuro.local/assistant/index.html?desktop=1");
        }catch(Exception e){status.Text="启动未完成";MessageBox.Show(this,"无法打开问诊助手。\n"+e.Message+"\n\n请完整解压文件夹。Windows 7 需 SP1、.NET Framework 4.6.2 或更高版本，以及 WebView2 109。详见使用说明。",Text,MessageBoxButtons.OK,MessageBoxIcon.Information);}
    }
    async void OnMessage(object sender,CoreWebView2WebMessageReceivedEventArgs e)
    {
        if(!IsLocal(e.Source))return;
        try{
            var message=json.Deserialize<Dictionary<string,object>>(e.WebMessageAsJson);
            string type=Convert.ToString(message["type"]);
            if(type=="copy"){
                string text=Convert.ToString(message["text"]);
                string kind=message.ContainsKey("kind")?Convert.ToString(message["kind"]):"病历";
                bool copied=false;
                for(int attempt=0;attempt<4&&!copied;attempt++){
                    try{Clipboard.SetText(text,TextDataFormat.UnicodeText);copied=true;}
                    catch(System.Runtime.InteropServices.ExternalException){}
                    if(!copied)await Task.Delay(100);
                }
                status.Text=copied?"已复制"+kind+"，切换医院病历后按 Ctrl+V 粘贴":"剪贴板暂时被占用，请重试";
                await browser.ExecuteScriptAsync("window.neuroDesktop.copyResult("+(copied?"true":"false")+","+json.Serialize(kind)+")");
            }else if(type=="backup"){
                using(var dialog=new SaveFileDialog{Filter="接诊备份 (*.json)|*.json",FileName="神内接诊备份_"+DateTime.Now.ToString("yyyyMMdd_HHmm")+".json"}){
                    if(dialog.ShowDialog(this)==DialogResult.OK){File.WriteAllText(dialog.FileName,Convert.ToString(message["text"]),new System.Text.UTF8Encoding(false));status.Text="备份已保存";}
                }
            }else if(type=="restore"){
                using(var dialog=new OpenFileDialog{Filter="接诊备份 (*.json)|*.json"}){
                    if(dialog.ShowDialog(this)==DialogResult.OK){var file=new FileInfo(dialog.FileName);if(file.Length>10000000)throw new Exception("备份文件超过支持的大小。");await browser.ExecuteScriptAsync("window.neuroDesktop.importRecords("+json.Serialize(File.ReadAllText(file.FullName))+")");}
                }
            }
        }catch(Exception ex){status.Text="操作未完成："+ex.Message;}
    }
    [STAThread]
    static void Main(string[] args)
    {
        // Give the desktop app its own taskbar group when launched from Codex.
        SetCurrentProcessExplicitAppUserModelID("ClinicalShiwen.NeuroIntake.Desktop");
        Application.EnableVisualStyles();Application.SetCompatibleTextRenderingDefault(false);
        string testProfile=null;bool force109=false;
        foreach(string arg in args){if(arg.StartsWith("--profile="))testProfile=Path.GetFullPath(arg.Substring(10));if(arg=="--runtime109")force109=true;}
        Application.Run(new DesktopWindow(testProfile,force109));
    }
    [System.Runtime.InteropServices.DllImport("shell32.dll", CharSet=System.Runtime.InteropServices.CharSet.Unicode)]
    static extern int SetCurrentProcessExplicitAppUserModelID(string appID);
}
