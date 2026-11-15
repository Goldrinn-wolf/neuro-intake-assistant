const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const ctx=vm.createContext({console,localStorage:{getItem:()=>null,setItem:()=>{}},Date,Map,Set});
for(const name of ['data.js','workflow.js','closing.js','story-rules.js','history-composition.js','narrative.js']){
 vm.runInContext(fs.readFileSync((name==='data.js'?'outputs/查房联动演示/assistant/':'work/neuro-intake/')+name,'utf8'),ctx);
}
const app=fs.readFileSync('work/neuro-intake/app.js','utf8');
vm.runInContext(app.slice(0,app.indexOf('function fieldCard(')),ctx);
vm.runInContext(app.slice(app.indexOf('function fullNoteText('),app.indexOf('function backupRecords(')),ctx);
const run=s=>vm.runInContext(s,ctx);
run("active='draft';records.draft=blank();");
assert.equal(run('fullNoteText()'),'','Empty placeholders must not be copied as clinical facts');
run("record().historyMode='free';record().freeHistory='3天前翻身后出现眩晕，每次约10秒。';");
assert.equal(run('fullNoteText()'),'现病史\n3天前翻身后出现眩晕，每次约10秒。');
run("var eye=CONTENT.exams.find(exam=>exam.label.includes('眼位与眼球运动'));record().exams[eye.id]={method:'main',main:{state:'record',picks:['双眼各向活动充分'],note:'',grades:{}}};");
let note=run('fullNoteText()');
assert(note.includes('查体\n双眼各向活动充分'));
assert(!note.includes('Babinski'));assert(!note.includes('肌力Ⅴ'));
run("record().exams={};record().finalNotes={exam:{source:generatedExamDocument(),text:'眼震：右向水平眼震。'}};");
assert(run('fullNoteText()').includes('眼震：右向水平眼震。'),'Manual review draft must be respected');
run("record().answers.common_0={state:'record',picks:[],note:'新增症状'};record().exams[eye.id]={method:'main',main:{state:'record',picks:['双眼各向活动充分'],note:'',grades:{}}};");
assert(!run('fullNoteText()').includes('右向水平眼震'),'Stale review must not leak into copied note');
console.log('PASS: empty placeholders excluded; section headings; only recorded findings; current manual edits respected; stale edits invalidated.');
