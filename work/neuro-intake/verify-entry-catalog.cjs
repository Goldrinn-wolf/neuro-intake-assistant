const vm=require('vm'),fs=require('fs'),assert=require('node:assert/strict');
const context=vm.createContext({console,localStorage:{getItem:()=>null,setItem:()=>{}},Date,Map,Set,window:{scrollTo(){}}});
for(const name of ['data.js','workflow.js','closing.js','story-rules.js','history-composition.js','narrative.js']){
 const dir=name==='data.js'?'outputs/查房联动演示/assistant/':'work/neuro-intake/';
 vm.runInContext(fs.readFileSync(dir+name,'utf8'),context);
}
const app=fs.readFileSync('work/neuro-intake/app.js','utf8');
vm.runInContext(app.slice(0,app.indexOf('function fieldCard(')),context);
const run=s=>vm.runInContext(s,context);
run("var newCount=0;function page(){}function save(){}function newEncounter(){newCount++;active='visit_'+newCount;records[active]=blank();} active='draft';records.draft=blank();");
const catalog=run('CONTENT.entryGroups');
assert.equal(catalog.length,11);
assert.deepEqual(Array.from(catalog,group=>group.key).sort(),Array.from(run('Object.keys(CONTENT.topics)')).sort());
const reached=new Set();
for(const group of catalog){
 assert(group.branches.some(branch=>branch.general),'Missing uncertain route: '+group.key);
 for(const branch of group.branches){
  context.routeKey=branch.route;
  const workflow=run('CONTENT.workflows[routeKey]');
  assert(workflow);assert.equal(workflow.parent,group.key);
  assert(workflow.questionIds.includes('common_0'));
  assert(workflow.questionIds.includes('common_1'));
  assert(workflow.questionIds.includes('common_9'));
  const valid=new Set(run('[...CONTENT.common,...CONTENT.background,...Object.values(CONTENT.topics).flatMap(topic=>topic.questions),...Object.values(CONTENT.profiles).flatMap(profile=>profile.questions)].map(question=>question.id)'));
  for(const id of workflow.questionIds)assert(valid.has(id),'Invalid question: '+id);
  if(branch.profile)reached.add(branch.profile);
 }
}
assert.equal(reached.size,30);
for(const parent of ['dizzy','weak','headache','sleep']){
 context.parent=parent;
 run("active='draft';records.draft=blank();startEntryRoute('symptom_'+parent)");
 assert.equal(run('Object.keys(record().answers).length'),0);
 assert.equal(run('Object.keys(record().exams).length'),0);
 assert.equal(run('Object.keys(record().screening).length'),0);
 assert.equal(run('record().profiles.length'),0);
 assert.equal(run('record().examMode'),'full');
 assert.equal(run('questions().length'),run('new Set(questions().map(question=>question.id)).size'));
 assert.equal(run('newCount'),0,'Choosing a first route must reuse the empty encounter');
 assert(!/正常|否认|无明显诱因/.test(run('naturalHistoryText()')));
}
run("active='draft';records.draft=blank();startEntryRoute('symptom_dizzy_bppv');record().answers.common_0={state:'record',picks:['眩晕'],note:''};record().answers.bppv_1={state:'record',picks:['静止后缓解'],note:'保留的原记录'};record().exams.e0={method:'main',main:{state:'record',picks:['清醒且可配合'],note:'',grades:{}}};record().screening.screen_balance={value:'询问后否认',note:''};");
const before=run('JSON.stringify(record())');context.before=before;
run("entryTopic='weak';shortcutsOpen=true;shortcutPanel()");
assert.equal(run('JSON.stringify(record())'),before,'Browsing categories must not change patient data');
run("startEntryRoute('symptom_dizzy_meniere')");
assert.equal(run('newCount'),0);
assert.equal(run('record().answers.bppv_1.note'),'保留的原记录');
assert.equal(run('record().exams.e0.main.state'),'record');
assert.equal(run('record().screening.screen_balance.value'),'询问后否认');
assert(run('questions().some(question=>question.id==="bppv_1")'));
assert(run('questions().some(question=>question.id==="meniere_1")'));
assert(run('naturalHistoryText().includes("保留的原记录")'));
run("var priorKey=active;startEntryRoute('symptom_weak_stroke')");
assert.equal(run('newCount'),1,'Different major symptom from a filled encounter starts a separate record');
assert.equal(run('records[priorKey].answers.bppv_1.note'),'保留的原记录');
assert.equal(run('Object.keys(record().answers).length'),0);
assert(run('questions().some(question=>question.id==="common_3")'));
run("record().answers.common_0={state:'record',picks:['肢体无力'],note:''};startEntryRoute('symptom_weak_mg')");
assert.equal(run('newCount'),1);
assert(run('questions().some(question=>question.id==="stroke_0")'));
assert(run('questions().some(question=>question.id==="mg_0")'));
assert.equal(run('record().answers.common_0.picks[0]'),'肢体无力');
assert.equal(run('record().examMode'),'full');
run("entryTopic=null;shortcutsOpen=true");
const landing=run('shortcutPanel()');
assert(landing.includes('主要症状分类'));
assert(!landing.includes('id="entry-directions"'),'Back should return to symptom selection');
console.log('PASS: 11 symptom categories, all 30 branches reachable, uncertain route for every category, valid questions, blank encounter reuse, no default findings, non-mutating category browsing, same-symptom additions preserve answers/exams/screening, new symptom record isolation, working back navigation.');
