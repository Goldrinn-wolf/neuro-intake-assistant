const vm=require('vm'),fs=require('fs'),assert=require('node:assert/strict');
const context=vm.createContext({console,localStorage:{getItem:()=>null,setItem:()=>{}},Date,Map,Set});
for(const name of ['data.js','workflow.js','closing.js','story-rules.js','history-composition.js','narrative.js']){
 const dir=name==='data.js'?'outputs/查房联动演示/assistant/':'work/neuro-intake/';
 vm.runInContext(fs.readFileSync(dir+name,'utf8'),context);
}
const source=fs.readFileSync('work/neuro-intake/app.js','utf8');
vm.runInContext(source.slice(0,source.indexOf('function fieldCard(')),context);
const run=s=>vm.runInContext(s,context);
run("function toast(message){ lastToast=message; } var lastToast=''; active='draft'; records.draft={answers:{},exams:{},topics:['dizzy'],profiles:['bppv'],workflow:'bppv'};");
const notes={
 common_8:'近1年曾有同类短暂发作，本次模式相同',
 common_9:'本次来院前未就诊或用药',
 common_10:'目前静止时无眩晕，发作间可独立行走',
 dizzy_1:'翻身后才出现，静卧时不晕',
 dizzy_4:'发作间可独立行走',
 bppv_2:'无近期颈部外伤及已知活动限制，既往未接受复位治疗'};
context.testNotes=notes;
run("const notes={...CONTENT.simulations.find(sample=>sample.key==='short_positional').notes,...testNotes};for(const [id,note] of Object.entries(notes))record().answers[id]={state:'record',picks:[],note};");
const savedEncounter=run('JSON.stringify(record())');
let history=run('naturalHistoryText()');
assert(!/患者自述|自述|自诉|患者诉/.test(history));
assert(history.startsWith('3天前翻身后出现反复旋转性眩晕。'));
assert(!history.includes('46岁'));
assert.equal((history.match(/3天/g)||[]).length,1);
assert.equal((history.match(/发作间/g)||[]).length,1);
assert(history.includes('翻身数秒后发作，每次持续10至20秒，静止后缓解'));
assert(history.includes('发作间歇期诉可独立行走'));
assert(!history.includes('收住入院'));assert(!history.includes('精神可'));assert(!history.includes('大小便如常'));
run("record().screening=Object.fromEntries(CONTENT.screening.map(item=>[item.id,{value:item.options[0]}]))");
const screenedHistory=run('naturalHistoryText()');
assert(!screenedHistory.includes('本次症状模式与既往无明显改变'));
assert(screenedHistory.includes('本次模式相同'));
assert(!screenedHistory.includes('逐项询问后'));
for(const fact of ['单侧无力','视力或视野变化','复视','意识改变','发作后持续未恢复','发热伴头痛及颈部症状','呼吸困难','吞咽障碍','不能独立坐、站或行走'])assert(screenedHistory.includes(fact));
run("record().screening.screen_change.note='近两日频率较前增加'");
assert(run('naturalHistoryText()').includes('近两日频率较前增加'));
run("record().screening={}");
run("record().closing={admission:'门诊收住入院'}");
assert.equal(run('closingReadyToCopy()'),true);
assert(!run('closingText()').includes('以“”'));
run("record().closing={course:'症状反复发作',visit:'遂来我院就诊',admission:'门诊收住入院',diagnosis:'“眩晕待查”',spirit:'可',sleep:'欠佳',bowel:'如常'}");
history=run('naturalHistoryText()');
assert(history.includes('症状反复发作，遂来我院就诊。门诊以“眩晕待查”收住入院。'));
assert(history.endsWith('发病以来，精神可，夜休欠佳，大便如常。'));
assert(!history.includes('大小便如常'));
run("record().closing.urine='尿频'");
assert(run('closingText()').includes('有尿频'));assert(!run('closingText()').includes('大小便如常'));
run("record().closing.urine='如常'");
assert(run('closingText()').endsWith('发病以来，精神可，夜休欠佳，大小便如常。'));
run("record().closing.course='症状持续不缓解'");
assert(run('closingWarnings().length')>0);
run("record().closing={};record().exams.e3={method:'main',main:{state:'record',picks:['构音清晰'],note:'',grades:{}}};record().exams.e45={method:'main',main:{state:'record',picks:['步态平稳'],note:'',grades:{}}}");
assert.equal(run("examText(CONTENT.exams.find(exam=>exam.id==='e3'))"),'构音清晰');
assert.equal(run("examText(CONTENT.exams.find(exam=>exam.id==='e45'))"),'步态平稳');
run("record().answers.common_0.note='近1年单侧肢体无力';record().answers.common_8.note='否认近1年单侧肢体无力'");
assert(run('compactChief(new Map(questions().map(q=>[q.id,q])))').includes('诉近1年单侧肢体无力'));
console.log('PASS: fact-preserving vertigo composition; no subject duplication; optional tail defaults empty; incomplete admission sentence omitted without blocking copy; bowel/bladder independent; persistent-course warning; exact examination observations');
console.log(history);
context.savedEncounter=savedEncounter;
const resetEncounter=()=>run('records[active]=JSON.parse(savedEncounter)');
resetEncounter();
run("record().answers.common_5={state:'unknown',picks:[],note:''}");
const unknownDuration=run('naturalHistoryText()');
assert(unknownDuration.includes('翻身数秒后发作，每次持续时间不详，静止后缓解'));
assert(!unknownDuration.includes('10至20秒'));
run("delete record().answers.common_5");
assert(!run('naturalHistoryText()').includes('每次持续时间不详'));
run("record().answers.common_5={state:'record',picks:[],note:'',amount:'15',unit:'秒/次'}");
assert(run('naturalHistoryText()').includes('每次持续15秒'));
resetEncounter();
run("record().answers.dizzy_4.note='发作期间能独立行走'");
const bothPeriods=run('naturalHistoryText()');
assert(bothPeriods.includes('发作期间诉可独立行走'));
assert(bothPeriods.includes('发作间歇期诉可独立行走'));
resetEncounter();
run("record().answers.common_0.note='反复旋转感3天';delete record().answers.dizzy_1;delete record().answers.common_6");
assert(run('naturalHistoryText()').startsWith('3天前出现反复旋转性眩晕'));
assert(!run('naturalHistoryText()').includes('无明显诱因'));
run("record().answers.common_6={state:'record',picks:['无明显诱因'],note:''}");
const noTrigger=run('naturalHistoryText()');
assert(noTrigger.startsWith('3天前无明显诱因出现反复旋转性眩晕'));
assert.equal((noTrigger.match(/无明显诱因/g)||[]).length,1);
resetEncounter();
run("record().answers={};for(const [id,note] of Object.entries(CONTENT.simulations.find(sample=>sample.key==='short_positional').notes))record().answers[id]={state:'record',picks:[],note}");
const originalSample=run('naturalHistoryText()');
assert(originalSample.startsWith('3天前翻身后出现反复旋转性眩晕'));
assert(originalSample.includes('近1年曾有同类短暂发作'));
assert(!originalSample.includes('46岁'));
console.log('PASS: onset-first narrative; historical intervals preserved; unknown duration is explicit only; numeric duration; attack and interictal function kept distinct; no invented trigger denial.');



