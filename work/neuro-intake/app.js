'use strict';
const content=CONTENT;
const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const h=escapeHtml;
const romanGrade=grade=>({'0':'0','1':'Ⅰ','2':'Ⅱ','3':'Ⅲ','4':'Ⅳ','5':'Ⅴ'}[grade]||grade);
const storageKey='neuro-intake-v2';
const $=selector=>document.querySelector(selector);
let records={},active='draft',stage='问诊',section='common',examGroup=content.exams[0].group;
let storageOk=true;
try{records=JSON.parse(localStorage.getItem(storageKey)||'{}');}catch{storageOk=false;}
function blank(){return {answers:{},exams:{},topics:[],profiles:[],updated:0};}
for(const key of ['draft',...Object.keys(content.cases)])if(!records[key])records[key]=blank();
for(const entry of Object.values(records)){
 entry.profiles=(entry.profiles||[]).filter(key=>content.profiles[key]);
}
const lastActive=localStorage.getItem(storageKey+'.active');
if(lastActive&&records[lastActive])active=lastActive;
const exampleSeeds={
 turning:{common_0:'翻身后反复旋转感',common_1:'近2天',common_4:'反复发作',common_5:'每次约10至20秒，一天多次',common_6:'向右翻身、躺下或仰头数秒后诱发，静止时不晕',dizzy_0:'周围景物旋转',dizzy_2:'自述无耳鸣及听力变化',dizzy_4:'自述发作间可正常行走'},
 continuous:{common_0:'持续旋转感、呕吐、站立不稳',common_1:'昨日早餐时，距原病例记录30小时',common_2:'突然出现',common_4:'持续存在',common_6:'静卧仍晕，转头加重',common_10:'呕吐3次，病史记载需两人扶持站立',dizzy_2:'无新发耳鸣，自觉听力无变化',background_0:'既往有高血压'},
 standing:{common_0:'站起后反复头昏、眼前发黑',common_1:'近3天',common_4:'反复发作',common_6:'站起十几秒出现，坐下约半分钟缓解',common_10:'近3天腹泻、进食饮水减少',dizzy_0:'眼前发黑、腿软，将要晕倒感，无旋转感',dizzy_1:'躺下及翻身不诱发',dizzy_5:'本次未完全丧失意识'},
 auditory:{common_0:'反复眩晕伴左耳耳鸣',common_1:'近1个月',common_4:'反复发作',common_5:'共3次，每次40至80分钟',common_6:'静坐或行走中自发出现，与翻身及站起均无固定关系',dizzy_0:'周围旋转',dizzy_2:'发作均伴左耳闷胀、低调耳鸣、主观声音发闷，数小时后减轻',dizzy_4:'发作间可正常活动'}
};
for(const [key,seeds] of Object.entries(exampleSeeds)){
 if(records[key].seeded)continue;
 records[key].topics=['dizzy'];
 for(const [question,note] of Object.entries(seeds)){
  if(!records[key].answers[question])records[key].answers[question]={state:'record',picks:[],note};
 }
 records[key].seeded=true;
}
const record=()=>records[active];
function save(){record().updated=Date.now();try{localStorage.setItem(storageKey,JSON.stringify(records));}catch{storageOk=false;}updatePreview();}
function activeProfiles(){return record().profiles.filter(key=>record().topics.includes(content.profiles[key].parent));}
function historySteps(){
 if(selectedWorkflow()){
  return ['screening','route',...(selectedWorkflow().followup?['followup']:[]),...(workflowQuestions().some(question=>question.section==='background')?['background']:[]),'closing'];
 }
 return ['common',...record().topics.flatMap(key=>[key,...activeProfiles().filter(profile=>content.profiles[profile].parent===key)]),'background','closing'];
}
function sectionName(key){
 if(key==='closing')return '就诊结尾与一般情况';
 if(key==='screening')return '先核对变化';
 if(key==='route')return selectedWorkflow()?.title||'症状问诊';
 if(key==='followup')return '复诊变化与用药';
 if(key==='common')return '起病与演变';
 if(key==='background')return '相关背景';
 return content.topics[key]?.title||content.profiles[key]?.title||'';
}
function questions(){return workflowQuestions();}
function selectedQuestions(){
 if(section==='route')return questions().filter(question=>!['followup','background'].includes(question.section)).sort((a,b)=>storyGroup(a)-storyGroup(b));
 if(section==='followup')return content.followup;
 if(section==='common')return content.common;
 if(section==='background')return selectedWorkflow()?questions().filter(question=>question.section==='background'):content.background;
 return content.topics[section]?.questions||content.profiles[section]?.questions||[];
}
function answerText(question){const entry=record().answers[question.id];if(!entry||entry.state==='pending')return '';if(entry.state==='unknown')return '情况不详';return [...(entry.picks||[]),entry.amount?entry.amount+(entry.unit||''):'',entry.note||''].filter(Boolean).join('，');}
function methodFor(exam){const saved=record().exams[exam.id]||{};return saved.method==='alt'&&exam.alt?exam.alt:exam;}
function examValue(exam){const saved=record().exams[exam.id]||{};const method=saved.method||'main';return saved[method]||{state:'pending',picks:[],note:'',grades:{}};}
function examinationResultValue(exam){const value=examValue(exam);return ['notdone','unable'].includes(value.state)?{...value,picks:[],grades:{},note:value.state==='notdone'?'':value.note}:value;}
function updateExaminationNote(entry,text){
 if(entry.state==='notdone'){
  if(!text.trim())return;
  resumeExamination(entry);
 }
 entry.note=text;
 if(entry.state==='unable')return;
 if(entry.state==='pending'&&text.trim())entry.state='record';
 if(!text.trim()&&!entry.picks.length&&!Object.values(entry.grades).some(Boolean))entry.state='pending';
}
function updateDeferredNote(entry,text){entry.deferNote=text;}
function resumeExamination(entry){
 if(!['notdone','unable'].includes(entry.state))return;
 entry.previousLimitation={state:entry.state,reason:entry.deferReason||'',note:entry.note||'',deferNote:entry.deferNote||'',picks:[...entry.picks],grades:{...entry.grades}};
 Object.assign(entry,{state:'pending',picks:[],note:'',grades:{},deferReason:'',deferNote:''});
}
function examText(exam){
 const value=examValue(exam);if(['pending','notdone'].includes(value.state))return '';
 const name=methodFor(exam).label.replace(/\s+[IVX、]+$/,'');
 if(value.state==='unable')return name+'无法评估'+(value.note?'（'+value.note+'）':'');
 const gradeEntries=Object.entries(value.grades||{}).filter(([,grade])=>grade!=='');
 const grades=gradeEntries.map(([key,grade])=>key+'肌力'+romanGrade(grade)+'级');
 if((record().exams[exam.id]?.method||'main')==='main'&&['上肢肌力','下肢肌力'].includes(exam.label)&&gradeEntries.length===10&&new Set(gradeEntries.map(([,grade])=>grade)).size===1){
  const scope=exam.label==='上肢肌力'?'双上肢所测肩外展、肘屈伸、腕背伸及指外展':'双下肢所测髋屈、膝屈伸、踝背伸及跖屈';
  return scope+'肌力均'+romanGrade(gradeEntries[0][1])+'级'+(value.note?'，'+value.note:'');
 }
 if((record().exams[exam.id]?.method||'main')==='main'&&['肱二头肌反射','肱三头肌反射','桡骨膜反射','膝反射','跟腱反射'].includes(exam.label)&&value.picks.length===2&&value.picks[0].slice(1)===value.picks[1].slice(1)&&new Set(value.picks.map(pick=>pick[0])).size===2){
  return '双侧'+exam.label+value.picks[0].slice(1)+(value.note?'，'+value.note:'');
 }
 const details=[...(value.picks||[]),...grades,value.note].filter(Boolean).join('，');
 if(exam.label==='意识与定向'&&['人物定向准确','地点定向准确','时间定向准确'].every(pick=>value.picks.includes(pick))&&value.picks.length===3){
  return '人物、地点及时间定向准确'+(value.note?'，'+value.note:'');
 }
 if(!details)return '';
 if(['构音','眼震','自然步态'].includes(exam.label)&&details.startsWith(name))return details;
 if(exam.label==='自然步态'&&/^步态/.test(details))return details;
 if(exam.label==='眼位与眼球运动 III、IV、VI'&&details==='双眼各向活动充分')return '双眼各向活动充分';
 if(exam.label==='一般观察与配合'&&details==='清醒且可配合')return '神志清醒，查体配合';
 if(exam.label==='坐位稳定性'&&details==='独立坐稳')return '可独立坐稳';
 if(exam.label==='指鼻试验'&&value.picks.length===2&&['左侧准确','右侧准确'].every(pick=>value.picks.includes(pick)))return '双侧指鼻试验准确'+(value.note?'，'+value.note:'');
 if(exam.label==='跟膝胫试验'&&value.picks.length===2&&['左侧准确','右侧准确'].every(pick=>value.picks.includes(pick)))return '双侧跟膝胫试验准确'+(value.note?'，'+value.note:'');
 return name+'：'+details;
}
function historyText(){
 return reviewedNote('history',naturalHistoryText());
}
function backgroundText(){return content.background.filter(question=>answerText(question)).map(question=>question.label+'，'+answerText(question)).join('。');}
function examSummary(abnormalOnly=false){return content.exams.filter(exam=>!abnormalOnly||examValue(exam).state==='abnormal').map(examText).filter(Boolean).join('。\n');}
function missingQuestions(){return questions().filter(question=>!question.optional&&(!answerText(question)||record().answers[question.id]?.state==='unknown'));}
function missingExams(){return content.exams.filter(exam=>!examComplete(exam));}
function reportText(){return historyText()+'\n'+examSummary(true);}
function chip(label,attrs,selected=false){return '<button class="chip '+(selected?'chosen':'')+'" '+attrs+' aria-pressed="'+selected+'">'+h(label)+'</button>';}
function scrollPageTop(){
 if(typeof document!=='undefined')document.querySelector('main')?.scrollTo(0,0);
 if(typeof window!=='undefined')window.scrollTo(0,0);
}
function fieldCard(question){
 const entry=record().answers[question.id]||{picks:[],note:'',state:'pending'};
 const units=['common_1','current_onset'].includes(question.id)?['天前','周前','个月前','年前']:question.id==='common_5'?['秒/次','分钟/次','小时/次','天/次']:question.id==='headache_1'?['分（0—10）']:[];
 const numeric=units.length?'<div class="quick-number"><label>'+(question.id==='headache_1'?'疼痛评分':'快捷时长')+' <input aria-label="'+h(question.label)+'数值" type="number" min="0" max="'+(question.id==='headache_1'?'10':'99999')+'" step="any" data-amount="'+question.id+'" value="'+h(entry.amount||'')+'"></label><select aria-label="'+h(question.label)+'单位" data-unit="'+question.id+'">'+units.map(unit=>'<option '+((entry.unit||units[0])===unit?'selected':'')+'>'+unit+'</option>').join('')+'</select></div>':'';
 const available=question.optionsByTopic?new Set([...record().topics.flatMap(key=>question.optionsByTopic[key]||[]),...entry.picks]):null;
 return '<article class="card question" id="'+question.id+'"><div class="spread"><h3>'+h(question.label)+'</h3><span class="status">'+(entry.state==='unknown'?'情况不详':answerText(question)?'已录入':question.optional?'可选填':'待询问')+'</span></div><p class="ask">'+h(question.ask)+'</p><p class="why">'+h(question.why)+'</p><div class="chips">'+question.options.map((option,index)=>!available||available.has(option)?chip(option,'data-question="'+question.id+'" data-option="'+index+'"',entry.picks.includes(option)):'').join('')+'</div>'+numeric+'<textarea data-note="'+question.id+'" placeholder="补充时间、侧别或患者原话" maxlength="1000">'+h(entry.note)+'</textarea><div class="small-actions"><button data-unknown="'+question.id+'">'+(question.id==='common_5'?'每次持续时间不详':'情况不详')+'</button><button data-clear="'+question.id+'">清除此项</button></div></article>';
}
function muscleRows(exam){
 if(!['上肢肌力','下肢肌力'].includes(exam.label)||methodFor(exam)===exam.alt)return '';
 const muscles=exam.label==='上肢肌力'?['肩外展','肘屈','肘伸','腕背伸','指外展']:['髋屈','膝伸','膝屈','踝背伸','跖屈'];
 const value=examinationResultValue(exam);
 return '<p class="why">0 无收缩 · Ⅰ 可见收缩 · Ⅱ 去重力活动 · Ⅲ 抗重力 · Ⅳ 抗部分阻力 · Ⅴ 正常阻力</p><div class="muscle-table"><div>肌群</div><b>左侧</b><b>右侧</b>'+muscles.map(muscle=>'<label>'+muscle+'</label>'+['左','右'].map(side=>'<select aria-label="'+side+muscle+'" data-grade="'+exam.id+'" data-muscle="'+side+muscle+'"><option value="">未查</option>'+['0','1','2','3','4','5'].map(grade=>'<option value="'+grade+'" '+(value.grades?.[side+muscle]===grade?'selected':'')+'>'+romanGrade(grade)+'</option>').join('')+'</select>').join('')).join('')+'</div>';
}
function reflexRows(exam){
 if(!['肱二头肌反射','肱三头肌反射','桡骨膜反射','膝反射','跟腱反射'].includes(exam.label))return '';
 const value=examinationResultValue(exam);
 return '<div class="chips">'+['左','右'].map(side=>'<div><small>'+side+'侧</small> '+['0','1+','2+','3+','4+'].map(grade=>chip(side+grade,'data-reflex="'+exam.id+'" data-value="'+side+grade+'"',value.picks.includes(side+grade))).join('')+'</div>').join('')+'</div>';
}
function examCard(exam){
 const saved=record().exams[exam.id]||{},method=methodFor(exam),rawValue=examValue(exam),value=examinationResultValue(exam);
 const alternate=!!exam.alt;
 const reasons=priorities().get(exam.label)||[];
 const significance=content.explanations?.[exam.label];
 const statusText=!['pending','unable','notdone'].includes(value.state)&&!examComplete(exam)?(value.state==='abnormal'?'异常·部分记录':'部分已录'):({pending:'未查',record:'已记录',abnormal:'已标异常',unable:'无法评估',notdone:'本次未查'}[value.state]);
 return '<article class="card exam '+(reasons.length?'priority':'')+'" id="'+exam.id+'"><div class="spread"><h3>'+h(exam.label)+'</h3><span class="status">'+statusText+'</span></div>'+
 (reasons.length?'<p class="priority-reason">重点查体 · '+h(reasons.join('；'))+'</p>':'')+
 (significance?'<details class="significance"><summary>查哪里 · 这个结果说明什么</summary><p>'+h(significance)+'</p></details>':'')+
 (alternate?'<div class="method-switch">'+chip('常规方法','data-method="'+exam.id+'" data-choice="main"',saved.method!=='alt')+chip(exam.alt.label,'data-method="'+exam.id+'" data-choice="alt"',saved.method==='alt')+'</div>':'')+
 examinationInstructions(exam,method,saved)+examinationControls(exam)+
 '<div class="chips">'+method.options.map((option,index)=>chip(option,'data-exam="'+exam.id+'" data-option="'+index+'"',value.picks.includes(option))).join('')+'</div>'+
 quickExaminationAction(exam)+
 '<textarea data-exam-note="'+exam.id+'" maxlength="1200" placeholder="'+(value.state==='unable'?'填写评估受限原因（自动保存）':saved.method==='alt'?'填写本方法的实际观察（自动保存）':'补充实际所见（选填，自动保存）')+'">'+h(value.note)+'</textarea>'+
 '<label class="defer-label">本次未查原因 <select data-notdone="'+exam.id+'"><option value="">选择原因</option>'+[...new Set(['本次无指征','安全条件不具备','患者拒绝','稍后补查','其他',...(value.state==='notdone'&&value.deferReason?[value.deferReason]:[])])].map(reason=>'<option '+(value.state==='notdone'&&value.deferReason===reason?'selected':'')+'>'+h(reason)+'</option>').join('')+'</select></label>'+
 '<details class="defer-note" '+(value.state==='notdone'?'':'hidden')+'><summary>未查备注（选填）</summary><textarea data-defer-note="'+exam.id+'" maxlength="1200" placeholder="补充未查原因，自动保存">'+h(rawValue.deferNote??(rawValue.state==='notdone'?rawValue.note:''))+'</textarea></details>'+
 '<div class="small-actions"><button data-exam-state="'+exam.id+'" data-state="abnormal" class="'+(value.state==='abnormal'?'selected':'')+'">标记异常</button>'+(value.state==='abnormal'?'<button data-exam-state="'+exam.id+'" data-state="record">取消异常标记</button>':'')+'<button data-exam-state="'+exam.id+'" data-state="unable" class="'+(value.state==='unable'?'selected':'')+'">'+(value.state==='unable'?'取消无法评估':'无法评估')+'</button><button data-exam-state="'+exam.id+'" data-state="pending">撤回本方法结果</button></div></article>';
}
function nav(){
 const visits=Object.keys(records).filter(key=>key.startsWith('visit_'));
 $('#records').innerHTML='<button class="primary" data-new-visit>＋ 新建接诊</button><div class="small-actions"><button data-backup>备份</button><button data-restore>恢复</button></div><button data-case="draft" class="'+(active==='draft'?'active':'')+'">空白接诊记录</button>'+visits.reverse().map(key=>'<button data-case="'+key+'" class="'+(active===key?'active':'')+'">'+h(records[key].title||'接诊记录')+'</button>').join('')+Object.entries(content.cases).map(([key,value])=>'<button data-case="'+key+'" class="'+(active===key?'active':'')+'">'+h(value.short)+'</button>').join('');
 $('#tabs').innerHTML=['问诊','查体','病历预览','查房准备'].map(name=>'<button data-stage="'+name+'" class="'+(stage===name?'active':'')+'">'+name+'</button>').join('');
 const groups=stage==='查体'?visibleExamGroups():historySteps();
 $('#steps').innerHTML=stage==='问诊'?groups.map(key=>'<button data-section="'+key+'" class="'+(section===key?'active':'')+'">'+h(sectionName(key))+'</button>').join(''):stage==='查体'?groups.map(group=>'<button data-group="'+group+'" class="'+(examGroup===group?'active':'')+'">'+group+'</button>').join(''):'';
 if(stage==='问诊'&&entryPickerExpanded())$('#steps').innerHTML='';
}
function page(){
 document.body.dataset.stage=stage;
 if(stage==='问诊'&&!historySteps().includes(section))section=historySteps()[0];
 if(stage==='查体'&&!visibleExamGroups().includes(examGroup))examGroup=visibleExamGroups()[0];
 nav();
 $('#title').textContent=content.cases[active]?.short||record().title||'接诊记录';
 let html='';
 if(stage==='问诊'){
 html='<section class="card"><h3>本次主诉</h3><div class="chips">'+Object.entries(content.topics).map(([key,value])=>chip(value.title,'data-topic="'+key+'"',record().topics.includes(key))).join('')+'</div><p class="why">可同时选择多个主诉，点击上方步骤按顺序询问。</p></section>'+selectedQuestions().map(fieldCard).join('')+'<button class="primary next" data-next="history">下一步 →</button>';
 const branchChoices=record().topics.map(parent=>{
  const entries=Object.entries(content.profiles).filter(([,profile])=>profile.parent===parent);
  return entries.length?'<div class="profile-group"><h4>'+h(content.topics[parent].title)+'</h4><div class="chips">'+entries.map(([key,profile])=>chip(profile.title,'data-profile="'+key+'"',record().profiles.includes(key))).join('')+'</div></div>':'';
 }).join('');
 html='<section class="card focused"><h3>需要补问的专病方向</h3><p class="why">选择后加入问诊顺序。选项用于补充病史，诊断需结合完整评估。</p>'+branchChoices+'</section>'+html;
 if(content.cases[active])html='<section class="card"><details><summary>查看原虚构病例全文与检查资料</summary><p>'+h(content.cases[active].history)+'</p></details></section>'+html;
 const quick=record().historyMode==='free';
 const modeBar='<section class="card"><div class="spread"><h3>录入方式</h3><div class="chips">'+chip('向导问诊','data-history-mode="guided"',!quick)+chip('快捷草稿','data-history-mode="free"',quick)+'</div></div><p class="why">向导按项组织记录；快捷草稿可直接写入或粘贴现病史，再查看重点查体。</p></section>';
 html=modeBar+(quick?'<section class="card"><h3>快捷现病史</h3><textarea class="free-history" data-free-history placeholder="直接写入或粘贴本次现病史，内容会自动保存。">'+h(record().freeHistory||'')+'</textarea><p class="why">当前输出采用这份草稿。可直接修改文字，核对后复制到医院病历。</p><button class="primary" data-stage="查体">进入查体 →</button></section>':html);
 if(selectedWorkflow()&&!quick){
  html=section==='screening'?screeningCards():selectedQuestions().map(fieldCard).join('')+'<button class="primary next" data-next="history">下一步 →</button>';
 }
 html=shortcutPanel()+html;
 if(section==='closing')html=shortcutPanel()+closingPanel();
 if(entryPickerExpanded())html=shortcutPanel();
 }else if(stage==='查体'){
 const groups=visibleExamGroups();
 if(!groups.includes(examGroup))examGroup=groups[0];
 const continuous=record().examMode==='focused'&&!showOtherExams;
 const groupCards=group=>'<div class="sectionhead" id="exam-group-'+content.exams.map(exam=>exam.group).filter((name,index,all)=>all.indexOf(name)===index).indexOf(group)+'"><h2>'+h(group)+'</h2><p>点选、输入后自动保存。琥珀色条目标示病史提示的重点，可查看具体依据。</p></div>'+visibleExams().filter(exam=>exam.group===group).map(examCard).join('');
 html=examModePanel()+(continuous?groups.map(groupCards).join(''):groupCards(examGroup))+(continuous?'<button class="primary next" data-stage="病历预览">核对与复制 →</button>':'<button class="primary next" data-next="exam">下一组 →</button>');
 }else if(stage==='病历预览'){
 html=previewCards()+'<button class="primary" data-stage="查房准备">准备查房 →</button>';
 }else{
 const c=content.cases[active];
 html='<section class="card hero"><h2>查房汇报草稿</h2><p id="roundText" class="prose"></p><button class="primary" data-copy="report">复制汇报</button></section>';
 if(c)html+='<section class="card"><h2>原例简短讲解</h2><p class="why">以下内容对应原虚构病例，补录后请结合当前记录核对。</p>'+c.lessons.map(lesson=>'<details><summary>'+h(lesson.title)+'</summary><p>'+h(lesson.explanation)+'</p></details>').join('')+'</section><section class="card"><h2>优先练这三题</h2>'+c.questions.map((q,index)=>'<details '+(index>2?'class="other-question"':'')+'><summary>'+h(q.question)+'</summary><p>原例参考答案　'+h(q.answer)+'</p></details>').join('')+'</section>';
 else html+='<section class="card"><h3>补全当前记录</h3><p class="why">先核对右侧待补问诊和查体，再复制汇报草稿。</p></section>';
 }
 $('#workspace').innerHTML=html;
 updatePreview();
}
function previewCards(){
 return '<section class="card"><h3>核对后复制到医院对应字段</h3><p class="why">可修改生成稿的措辞。事实更正请返回问诊或查体字段，原记录变化后会重新生成待核对稿。</p><a href="hospital-simulator.html" target="_blank">打开模拟医院病历页，仅供虚构病例演练</a></section>'+reviewPanel('history','现病史','historyText')+reviewPanel('exam','查体记录','examText')+'<section class="card"><div class="spread"><h2>相关背景</h2><button data-copy="background">复制相关背景</button></div><p id="backgroundText" class="prose"></p></section><section class="card"><h2>异常体征摘录</h2><p id="abnormalText" class="prose"></p></section>';
}
function updatePreview(){
 refreshClosingWarnings();
 for(const [selector,text] of [['#historyText',historyText()],['#backgroundText',backgroundText()||'尚无相关背景记录。'],['#examText',examDocument()],['#abnormalText',examSummary(true)||'尚无已标记的异常体征。'],['#roundText',reportText()]]){
  const element=$(selector);
  if(!element)continue;
  if(element.tagName==='TEXTAREA'){if(element.value!==text)element.value=text;}
  else element.textContent=text;
 }
 for(const kind of ['history','exam'])if($('#review-status-'+kind))$('#review-status-'+kind).textContent=reviewStatus(kind);
 $('#save-status').textContent=storageOk?'已在本机保存':'当前仅在页面内保存';
 $('#live').textContent=historyText();
 if($('#examScope'))$('#examScope').textContent=examScopeText();
 if(!record().topics.length&&!hasClinicalData()){$('#gaps').innerHTML='<h3>先选择主要症状</h3><p class="why">选择后再展开对应的问诊问题与待补项目。</p>';$('#urgent').hidden=true;return;}
 const missing=record().historyMode==='free'?[]:missingQuestions();
 const focus=priorities();
 const priorityBox=focus.size?'<div class="focus-box"><h3>病史提示的重点查体</h3><p class="why">琥珀色标记，按病史线索提示核查，完成后仍保留提示依据。</p>'+content.exams.filter(exam=>focus.has(exam.label)).map(exam=>'<button data-jump-exam="'+exam.id+'">'+h(exam.label)+' <span>›</span></button>').join('')+'</div>':'<p class="why">录入明确病史线索后，这里提示重点查体。</p>';
 const recommendationState=recommendation();
 const advice=recommendationState.reasons.length?'<details><summary>查体范围提示</summary><p class="why">'+h(recommendationState.reasons.join('；'))+'</p><button data-stage="查体">查看查体范围</button></details>':'';
 const keyMissing=record().examMode==='focused'?completeKeyExams():missingExams();
 const pendingScreen=selectedWorkflow()?content.screening.filter(item=>{
  const entry=record().screening?.[item.id];
  return !entry||['情况不详','尚未充分询问'].includes(entry.value)||(item.risk.includes(entry.value)&&!entry.note?.trim());
 }):[];
 const screeningGaps=pendingScreen.length?'<h3>变化核对待补 · '+pendingScreen.length+'</h3>'+pendingScreen.map(item=>'<button data-jump-screening="'+item.id+'">'+h(item.label)+' <span>›</span></button>').join(''):'';
 $('#gaps').innerHTML=advice+priorityBox+screeningGaps+'<h3>待补问诊 · '+missing.length+'</h3>'+missing.map(question=>'<button data-jump-question="'+question.id+'">'+h(question.label)+' <span>›</span></button>').join('')+'<details><summary>'+(record().examMode==='focused'?'关键项目':'查体')+'待完成 · '+keyMissing.length+'</summary>'+keyMissing.map(exam=>'<button data-jump-exam="'+exam.id+'">'+h(exam.label)+' <span>›</span></button>').join('')+'</details>';
 if(stage==='问诊'&&entryPickerExpanded())$('#gaps').innerHTML='<h3>选择问诊方向</h3><p class="why">先选主要症状，再选表现或通用问诊。选择后展开本次需要询问的项目。</p>';
 $('#urgent').hidden=true;
}
function examSaved(id){
 const saved=record().exams[id]||={method:'main'};
 const method=saved.method||'main';
 if(!saved[method])saved[method]={state:'pending',picks:[],note:'',grades:{}};
 return saved[method];
}
function togglePick(picks,value){
 const index=picks.indexOf(value);
 if(index>=0)return picks.filter(pick=>pick!==value);
 const exclusive=value==='以上均否认'||value==='情况不详';
 return exclusive?[value]:[...picks.filter(pick=>!['以上均否认','情况不详'].includes(pick)),value];
}
function updateHistoryState(entry){
 entry.state=entry.note||entry.picks.length||entry.amount?'record':'pending';
}
function questionEntry(id){return record().answers[id]||={state:'pending',picks:[],note:''};}
function positiveClue(text,terms){
 const clauses=text.split(/[，,。；;\n]|但是|但|然而/);
 for(const clause of clauses){
  for(const term of terms){
   const index=clause.indexOf(term);
   if(index<0)continue;
   const prefix=clause.slice(0,index);
   if(/情况不详|记不清|不确定|无法确认/.test(clause))continue;
   if(/否认|没有|未诉|未见|未出现|未发生|不伴|无(?!力)/.test(prefix))continue;
   return term;
  }
 }
 return '';
}
function priorities(){
 const result=new Map();
 const freeMode=record().historyMode==='free';
 const entries=freeMode?[{id:'free',label:'快捷草稿'}]:questions().filter(question=>record().answers[question.id]?.state==='record');
 for(const item of content.screening||[]){
  const entry=record().screening?.[item.id];
  if(entry&&item.risk.includes(entry.value))entries.push({id:item.id,label:item.label,screenNote:entry.note||''});
 }
 for(const rule of content.priorityRules||[]){
  const evidence=entries.find(question=>{
   const answer=question.screenNote!==undefined?question.screenNote:freeMode?(record().freeHistory||''):answerText(question);
   if(positiveClue(answer,rule.terms))return true;
   const contexts={weak_0:'无力',sensory_1:'麻木',movement_0:'不自主运动'};
   return contexts[question.id]&&rule.terms.includes(contexts[question.id])&&!/否认|情况不详|没有/.test(answer);
  });
  if(!evidence)continue;
  const reason=rule.note+'（'+evidence.label+'）';
  for(const label of rule.exams){
   if(!result.has(label))result.set(label,[]);
   result.get(label).push(reason);
  }
 }
 return result;
}
function changed(){save();page();}
function jump(id){requestAnimationFrame(()=>document.getElementById(id)?.scrollIntoView({behavior:'auto',block:'center'}));}
document.addEventListener('input',event=>{
 const field=event.target;
 if(closingInput(field))return;
 if(reviewInput(field))return;
 if(field.dataset.screeningNote){record().screening[field.dataset.screeningNote].note=field.value;save();return;}
 if(field.hasAttribute('data-free-history')){record().freeHistory=field.value;save();return;}
 if(field.dataset.note){const entry=questionEntry(field.dataset.note);entry.note=field.value;updateHistoryState(entry);save();}
 if(field.dataset.amount){const entry=questionEntry(field.dataset.amount);entry.amount=field.validity.valid?field.value:'';entry.unit=$('[data-unit="'+field.dataset.amount+'"]').value;if(['common_1','current_onset'].includes(field.dataset.amount)&&entry.amount){entry.picks=[];if(parseHistoryTime(entry.note))entry.note='';}updateHistoryState(entry);save();}
 if(field.dataset.deferNote){updateDeferredNote(examSaved(field.dataset.deferNote),field.value);save();return;}
 if(field.dataset.examNote){
  const entry=examSaved(field.dataset.examNote);updateExaminationNote(entry,field.value);
  save();
 }
 const card=field.closest('.card');
 const status=card?.querySelector('.status');
 if(status&&field.dataset.examNote){
  const value=examSaved(field.dataset.examNote);
  status.textContent={pending:'未查',record:'已记录',abnormal:'已标异常',unable:'无法评估',notdone:'本次未查'}[value.state];
  const deferred=card.querySelector('.defer-note');if(deferred)deferred.hidden=value.state!=='notdone';
  const reason=card.querySelector('select[data-notdone]');if(reason&&value.state!=='notdone')reason.value='';
 }
 if(status&&(field.dataset.note||field.dataset.amount)){
  const value=questionEntry(field.dataset.note||field.dataset.amount);
  status.textContent=value.state==='pending'?'待询问':value.state==='unknown'?'情况不详':'已录入';
 }
});
document.addEventListener('change',event=>{
 if(event.target.dataset.notdone){
  const reason=event.target.value;
  const entry=examSaved(event.target.dataset.notdone);
  if(!reason){resumeExamination(entry);changed();jump(event.target.dataset.notdone);return;}
  if(examText(content.exams.find(exam=>exam.id===event.target.dataset.notdone))&&!window.confirm('此项已有记录。确认本次不采用原所见，改为未查并注明原因？')){page();return;}
  entry.state='notdone';entry.deferReason=reason;
  changed();jump(event.target.dataset.notdone);return;
 }
 if(event.target.dataset.unit){const entry=questionEntry(event.target.dataset.unit);entry.unit=event.target.value;updateHistoryState(entry);save();return;}
 if(!event.target.dataset.grade)return;
 const entry=examSaved(event.target.dataset.grade);
 resumeExamination(entry);
 entry.grades[event.target.dataset.muscle]=event.target.value;
 const grades=Object.values(entry.grades).filter(Boolean);
 entry.state=grades.some(grade=>grade!=='5')?'abnormal':grades.length?'record':'pending';
 changed();
});
document.addEventListener('click',async event=>{
 const button=event.target.closest('button');if(!button)return;
 if(closingClick(button))return;
 if(reviewClick(button))return;
 if(workflowClick(button))return;
 const d=button.dataset;
 if(d.case){active=d.case;try{localStorage.setItem(storageKey+'.active',active);}catch{}stage='问诊';section='common';entryTopic=null;shortcutsOpen=null;page();}
 else if(d.historyMode){record().historyMode=d.historyMode;changed();}
 else if(button.hasAttribute('data-new-visit'))newEncounter();
 else if(button.hasAttribute('data-backup'))backupRecords();
 else if(button.hasAttribute('data-restore'))restoreRecords();
 else if(d.stage){stage=d.stage;page();scrollPageTop();}
 else if(d.section){section=d.section;if(selectedWorkflow())shortcutsOpen=false;page();scrollPageTop();}
 else if(d.group){
  examGroup=d.group;
  if(record().examMode==='focused'&&!showOtherExams){
   const groupIndex=[...new Set(content.exams.map(exam=>exam.group))].indexOf(examGroup);
   document.getElementById('exam-group-'+groupIndex)?.scrollIntoView({behavior:'smooth',block:'start'});
   for(const button of document.querySelectorAll('[data-group]'))button.classList.toggle('active',button.dataset.group===examGroup);
  }else{page();scrollPageTop();}
 }
 else if(d.topic){const topics=record().topics;record().topics=topics.includes(d.topic)?topics.filter(topic=>topic!==d.topic):[...topics,d.topic];if(!historySteps().includes(section))section='common';changed();}
 else if(d.profile){const selected=record().profiles;record().profiles=selected.includes(d.profile)?selected.filter(key=>key!==d.profile):[...selected,d.profile];if(record().profiles.includes(d.profile))section=d.profile;else if(section===d.profile)section=content.profiles[d.profile].parent;changed();}
 else if(d.question){
  const question=questions().find(item=>item.id===d.question),entry=questionEntry(d.question),option=question.options[Number(d.option)];
  const group=question.exclusiveGroups?.find(items=>items.includes(option));
  if(group&&!entry.picks.includes(option))entry.picks=entry.picks.filter(pick=>!group.includes(pick));
  if(['common_1','current_onset'].includes(d.question)){entry.amount='';if(parseHistoryTime(entry.note))entry.note='';}
  entry.picks=togglePick(entry.picks,option);updateHistoryState(entry);changed();jump(d.question);
 }
 else if(d.unknown){record().answers[d.unknown]={state:'unknown',picks:[],note:''};changed();jump(d.unknown);}
 else if(d.clear){delete record().answers[d.clear];changed();jump(d.clear);}
 else if(d.method){const saved=record().exams[d.method]||={};saved.method=d.choice;changed();jump(d.method);}
 else if(d.exam){
  const exam=content.exams.find(item=>item.id===d.exam),entry=examSaved(d.exam);
  resumeExamination(entry);
  const option=methodFor(exam).options[Number(d.option)];
  const groups=methodFor(exam).exclusiveGroups||[];
  const group=groups.find(items=>items.includes(option));
  if(group&&!entry.picks.includes(option))entry.picks=entry.picks.filter(pick=>!group.includes(pick));
  if(/^[左右][0-4]\+?$/.test(option))entry.picks=entry.picks.filter(pick=>!(pick[0]===option[0]&&/^[左右][0-4]\+?$/.test(pick))||pick===option);
  entry.picks=togglePick(entry.picks,option);
  if(['pending','unable','notdone'].includes(entry.state))entry.state='record';
  if(!entry.note&&!entry.picks.length&&!Object.values(entry.grades).some(Boolean))entry.state='pending';
  changed();jump(d.exam);
 }
 else if(d.reflex){const entry=examSaved(d.reflex),side=d.value[0];resumeExamination(entry);entry.picks=entry.picks.filter(pick=>!pick.startsWith(side));entry.picks.push(d.value);entry.state='record';changed();jump(d.reflex);}
 else if(d.examState){const entry=examSaved(d.examState);if(d.state==='unable'&&entry.state==='unable'){resumeExamination(entry);changed();jump(d.examState);return;}if(d.state==='pending'){Object.assign(entry,{state:'pending',picks:[],note:'',grades:{}});}else{if(d.state==='abnormal'&&['notdone','unable'].includes(entry.state)){toast('先点选或填写本次所见，再标记异常');return;}const exam=content.exams.find(item=>item.id===d.examState);if(d.state!=='unable'&&!entry.note&&!entry.picks.length&&!Object.values(entry.grades).some(Boolean)){toast('先填写实际所见，再保存状态');return;}entry.state=d.state;}changed();jump(d.examState);}
 else if(d.jumpQuestion){const question=questions().find(item=>item.id===d.jumpQuestion);stage='问诊';shortcutsOpen=false;section=selectedWorkflow()&&!['followup','background'].includes(question.section)?'route':question.section;page();jump(question.id);}
 else if(d.jumpScreening){stage='问诊';shortcutsOpen=false;section='screening';page();jump(d.jumpScreening);}
 else if(d.jumpExam){const exam=content.exams.find(item=>item.id===d.jumpExam);stage='查体';examGroup=exam.group;if(!visibleExams().includes(exam))showOtherExams=true;page();jump(exam.id);}
 else if(d.next){if(d.next==='history'){const steps=historySteps(),index=steps.indexOf(section);if(index<steps.length-1)section=steps[index+1];else stage='查体';}else{const groups=visibleExamGroups(),index=groups.indexOf(examGroup);if(index<groups.length-1)examGroup=groups[index+1];else stage='病历预览';}page();scrollPageTop();}
 else if(d.copy){
  if(['history','report'].includes(d.copy)&&!closingReadyToCopy())return;
  copyText(d.copy==='all'?fullNoteText():d.copy==='history'?historyText():d.copy==='exam'?examDocument():d.copy==='background'?backgroundText():reportText(),d.copy==='history'?'现病史':d.copy==='exam'?'查体':d.copy==='background'?'相关背景':d.copy==='all'?'整份病历':'汇报');
 }
});
function newEncounter(){
 shortcutsOpen=true;showOtherExams=false;entryTopic=null;
 active='visit_'+Date.now();
 records[active]=blank();
 record().topics=[];
 record().title='接诊 '+new Date().toLocaleString('zh-CN',{month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'});
 stage='问诊';section='common';
 try{localStorage.setItem(storageKey+'.active',active);}catch{}
 save();page();scrollPageTop();
}
function fullNoteText(){
 return [['现病史',historyText()],['查体',examDocument()],['相关背景',backgroundText()]].filter(([,text])=>copyableText(text)).map(([label,text])=>label+'\n'+text).join('\n\n');
}
function copyableText(text){return String(text||'').trim()&&!/^填写(?:快捷草稿|问诊)后，这里(?:显示|生成)现病史。$/.test(text)&&! /^(?:以上为本次已记录所见|本次为针对性查体)，未查或未记录项目待补。$/.test(text);}
async function copyText(text,kind){
 if(!copyableText(text)){toast('当前字段为空，请填写并核对后再复制');return;}
 if(window.chrome?.webview){window.chrome.webview.postMessage({type:'copy',text,kind:kind||'病历'});return;}
 try{await navigator.clipboard.writeText(text);toast('已复制');}catch{toast('请在预览中选择文字复制');}
}
function backupRecords(){
 const text=JSON.stringify({format:'neuro-intake-backup',version:1,records},null,2);
 if(window.chrome?.webview){window.chrome.webview.postMessage({type:'backup',text});return;}
 const url=URL.createObjectURL(new Blob([text],{type:'application/json'}));
 const link=document.createElement('a');link.href=url;link.download='神内接诊备份.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function importRecords(text){
 try{
  const data=JSON.parse(text);
  if(data.format!=='neuro-intake-backup'||data.version!==1||!data.records||typeof data.records!=='object')throw Error('文件格式不符');
  const valid={};
  for(const [key,value] of Object.entries(data.records)){
   if(!['draft',...Object.keys(content.cases)].includes(key)&&!/^visit_\d+$/.test(key))continue;
   if(!value||typeof value!=='object'||!value.answers||!value.exams||!Array.isArray(value.topics))throw Error('接诊记录结构不完整');
   const validQuestions=new Set([...content.common,...content.background,...(content.followup||[]),...Object.values(content.topics).flatMap(topic=>topic.questions),...Object.values(content.profiles).flatMap(profile=>profile.questions)].map(question=>question.id));
   for(const [id,answer] of Object.entries(value.answers)){
    if(!validQuestions.has(id)||!answer||!Array.isArray(answer.picks)||typeof answer.note!=='string'||!['record','pending','unknown'].includes(answer.state)||answer.picks.some(pick=>typeof pick!=='string'))throw Error('问诊记录格式不符');
   }
   for(const [id,exam] of Object.entries(value.exams)){
    if(!content.exams.some(item=>item.id===id)||!exam||!['main','alt',undefined].includes(exam.method))throw Error('查体记录格式不符');
    for(const method of ['main','alt'])if(exam[method]){
     const entry=exam[method];
     if(!entry||!Array.isArray(entry.picks)||typeof entry.note!=='string'||!entry.grades||typeof entry.grades!=='object'||!['pending','record','abnormal','unable','notdone'].includes(entry.state))throw Error('查体方法记录格式不符');
    }
   }
   value.topics=value.topics.filter(key=>content.topics[key]);
   value.profiles=(value.profiles||[]).filter(key=>content.profiles[key]);
   if(value.closing){
    if(typeof value.closing!=='object'||Array.isArray(value.closing))throw Error('结尾模板格式不符');
    for(const field of CLOSING_FIELDS)if(value.closing[field.key]&&!field.options.includes(value.closing[field.key]))throw Error('结尾选项格式不符');
    for(const key of ['diagnosis','generalNote'])if(value.closing[key]!==undefined&&typeof value.closing[key]!=='string')throw Error('结尾文字格式不符');
   }
   valid[key]=value;
  }
  records={...records,...valid};save();page();toast('备份已恢复');
 }catch(error){toast('恢复失败，'+error.message);}
}
function restoreRecords(){
 if(window.chrome?.webview){window.chrome.webview.postMessage({type:'restore'});return;}
 const input=document.createElement('input');input.type='file';input.accept='.json';
 input.onchange=async()=>{if(input.files[0])importRecords(await input.files[0].text());};
 input.click();
}
window.neuroDesktop={newEncounter,backupRecords,restoreRecords,importRecords,copyHistory:()=>{if(closingReadyToCopy())copyText(historyText(),'现病史');},copyExamination:()=>copyText(examDocument(),'查体'),copyAbnormal:()=>copyText(examSummary(true),'异常体征'),copyAll:()=>copyText(fullNoteText(),'整份病历'),copyResult:(ok,kind)=>toast(ok?'已复制'+kind+'，可粘贴到医院病历':'复制失败，请重试或在预览中选择文字复制')};
document.addEventListener('keydown',event=>{
 if(!window.chrome?.webview||!event.ctrlKey||event.altKey)return;
 const key=event.key.toLowerCase();
 const action=event.shiftKey?{c:'copyHistory',e:'copyExamination',a:'copyAll'}[key]:(key==='n'?'newEncounter':null);
 if(action){event.preventDefault();window.neuroDesktop[action]();}
});
function toast(text){$('#toast').textContent=text;$('#toast').hidden=false;setTimeout(()=>$('#toast').hidden=true,2200);}
$('#sources').innerHTML=content.sources.map(source=>'<a target="_blank" rel="noreferrer" href="'+h(source.url)+'">'+h(source.title)+'</a>').join('');
page();


